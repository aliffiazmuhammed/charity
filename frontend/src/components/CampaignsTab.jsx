import React, { useState, useEffect } from 'react';
import { getTemplates } from '../services/templateService';
import { getCampaignHistory, sendCampaign } from '../services/campaignService';
import { getAllDonors } from '../services/donorService';
import { getContacts, getContactTags } from '../services/contactService';
import api from '../config/api';
import { Upload, Users, Calendar, Send, BarChart2, RefreshCw, AlertCircle, Contact2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import CampaignDetailsModal from './CampaignDetailsModal';

export default function CampaignsTab() {
  const [history, setHistory] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [donors, setDonors] = useState([]);
  const [contactsList, setContactsList] = useState([]);
  const [contactTags, setContactTags] = useState([]);

  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  
  // Recipients
  const [recipients, setRecipients] = useState([]); // [{phone, name, amount, date}]
  const [recipientSource, setRecipientSource] = useState('donors'); // 'donors' | 'contacts'
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [donorSearch, setDonorSearch] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [contactTagFilter, setContactTagFilter] = useState('');
  const [manualEntry, setManualEntry] = useState({ name: '', phone: '' });
  const [showRecipientsModal, setShowRecipientsModal] = useState(false);

  // History filters & pagination
  const [campaignSearch, setCampaignSearch] = useState('');
  const [campaignStatus, setCampaignStatus] = useState('');
  const [campaignPage, setCampaignPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const [dailyLimit, setDailyLimit] = useState(null);
  const [dailyLimitRemaining, setDailyLimitRemaining] = useState(null);
  
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const histRes = await getCampaignHistory();
      const histData = histRes.data || histRes; // Handle if axios response or directly data
      
      const historyArr = Array.isArray(histData) ? histData : (histData.campaigns || []);
      setHistory(historyArr);

      const tpls = await getTemplates();
      // Only approved templates
      setTemplates(tpls.filter(t => t.metaStatus === 'APPROVED' || t.metaStatus === 'approved'));

      const dns = await getAllDonors({ limit: 10000 });
      setDonors(dns.donors || dns || []);

      // Fetch contacts for the recipient selector
      try {
        const contactsRes = await getContacts({ limit: 10000 });
        setContactsList(contactsRes.contacts || []);
        const tags = await getContactTags();
        setContactTags(tags);
      } catch (contactErr) {
        console.error('Failed to fetch contacts', contactErr);
      }

      // Fetch daily limit stats
      try {
        const usageRes = await api.get('/whatsapp/usage');
        setDailyLimit(usageRes.data.dailyLimit);
        setDailyLimitRemaining(usageRes.data.today.remaining);
      } catch (usageErr) {
        console.error('Failed to fetch usage limits', usageErr);
      }
    } catch (err) {
      console.error(err);
      setMessage('Failed to load data.');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      // Map data to recipients
      const newRecs = data.map(row => ({
        phone: String(row.phone || row.Phone || row.PHONE || '').trim(),
        name: row.name || row.Name || row.NAME || 'Donor',
        amount: String(row.amount || row.Amount || row.AMOUNT || '₹0'),
        date: String(row.date || row.Date || row.DATE || format(new Date(), 'dd MMM yyyy'))
      })).filter(r => r.phone);
      
      setRecipients(prev => {
        const existingPhones = new Set(prev.map(p => p.phone));
        const filteredNew = newRecs.filter(r => !existingPhones.has(r.phone));
        return [...prev, ...filteredNew];
      });
    };
    reader.readAsBinaryString(file);
    e.target.value = null;
  };

  const handleDonorSelect = (donor) => {
    if (recipients.some(r => r.phone === donor.phone)) {
      setRecipients(recipients.filter(r => r.phone !== donor.phone));
    } else {
      setRecipients([...recipients, {
        phone: donor.phone,
        name: donor.donorName || donor.name || 'Unknown',
        amount: '₹0',
        date: format(new Date(), 'dd MMM yyyy')
      }]);
    }
  };

  const handleContactSelect = (contact) => {
    if (recipients.some(r => r.phone === contact.phone)) {
      setRecipients(recipients.filter(r => r.phone !== contact.phone));
    } else {
      setRecipients([...recipients, {
        phone: contact.phone,
        name: contact.name || 'Unknown',
        amount: '₹0',
        date: format(new Date(), 'dd MMM yyyy')
      }]);
    }
  };

  const handleRemoveRecipient = (phone) => {
    setRecipients(recipients.filter(r => r.phone !== phone));
  };

  const handleAddManual = () => {
    if (!manualEntry.name || !manualEntry.phone) return;
    setRecipients([...recipients, {
      phone: manualEntry.phone.trim(),
      name: manualEntry.name.trim(),
      amount: '₹0',
      date: format(new Date(), 'dd MMM yyyy')
    }]);
    setManualEntry({ name: '', phone: '' });
  };

  const handleLaunch = async () => {
    if (!selectedTemplate) {
      setMessage('Please select a template.');
      return;
    }
    if (recipients.length === 0) {
      setMessage('Please add at least one recipient.');
      return;
    }

    const tpl = templates.find(t => t._id === selectedTemplate);
    if (!tpl) return;

    setLoading(true);
    setMessage('');

    try {
      // Extract required parameters from template body to match Meta's expected count and order
      const requiredParams = [];
      if (tpl.body) {
        const regex = /\{\{(\w+)\}\}/g;
        let match;
        const seen = new Set();
        while ((match = regex.exec(tpl.body)) !== null) {
          if (!seen.has(match[1])) {
            seen.add(match[1]);
            requiredParams.push(match[1]);
          }
        }
      }

      const payload = {
        templateName: tpl.metaTemplateName,
        campaignName: campaignName.trim(),
        languageCode: tpl.language || 'en',
        recipients: recipients.map(r => {
          // Map standard recipient fields to possible template variables
          const recipientVars = {
            donorName: r.name,
            name: r.name,
            amount: r.amount || '₹0',
            date: r.date || format(new Date(), 'dd MMM yyyy'),
            phone: r.phone
          };

          // Build the params array in the exact order the template expects
          const params = requiredParams.map(param => recipientVars[param] || '');

          return {
            phone: r.phone,
            name: r.name,
            params
          };
        }),
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null
      };

      const res = await sendCampaign(payload);
      
      if (res && res.summary && res.summary.message) {
        setMessage(res.summary.message);
      } else {
        setMessage('Campaign launched successfully!');
      }
      
      setRecipients([]);
      setScheduledAt('');
      setCampaignName('');
      setSelectedTemplate('');
      fetchData();
    } catch (err) {
      console.error(err);
      setMessage('Failed to launch campaign.');
    } finally {
      setLoading(false);
    }
  };

  // Filter and paginate history
  const filteredHistory = history.filter(camp => {
    const searchLower = campaignSearch.toLowerCase();
    const nameMatch = (camp.campaignName || camp.campaignId || '').toLowerCase().includes(searchLower) ||
                      (camp.templateName || '').toLowerCase().includes(searchLower);
    
    if (!nameMatch) return false;
    
    if (campaignStatus === 'success') return camp.failed === 0;
    if (campaignStatus === 'failed') return camp.failed > 0;
    return true; // 'all'
  });

  const totalCampaignPages = Math.max(1, Math.ceil(filteredHistory.length / ITEMS_PER_PAGE));
  const paginatedHistory = filteredHistory.slice((campaignPage - 1) * ITEMS_PER_PAGE, campaignPage * ITEMS_PER_PAGE);

  useEffect(() => {
    setCampaignPage(1);
  }, [campaignSearch, campaignStatus]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">

      <div className="bg-surface rounded-xl shadow-card border border-border-default overflow-hidden">
        <div className="p-4 border-b border-border-default bg-warm-white">
          <h2 className="font-semibold text-text-primary flex items-center gap-2">
            <Send size={20} className="text-primary" /> Campaign Builder
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {message && (
            <div className={`p-3 rounded-lg text-sm ${message.includes('success') ? 'bg-success-bg text-success border-success/20' : 'bg-danger-bg text-danger border-danger/20'} border`}>
              {message}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Select Template *</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full px-4 py-2 border border-border-strong rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-bg text-text-primary"
                >
                  <option value="">-- Choose an approved template --</option>
                  {templates.map(t => (
                    <option key={t._id} value={t._id}>{t.name} ({t.metaTemplateName})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Campaign Name (Optional)</label>
                <input
                  type="text"
                  placeholder="E.g., Onam Donation Drive 2026"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full px-4 py-2 border border-border-strong rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-bg text-text-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Schedule (Optional)</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full px-4 py-2 border border-border-strong rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-bg text-text-primary"
                />
                <p className="text-xs text-text-muted mt-1">Leave blank to send immediately.</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Upload Recipients (.xlsx)</label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border-strong rounded-lg cursor-pointer bg-bg hover:bg-bg/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-text-muted" />
                    <p className="text-sm text-text-secondary"><span className="font-semibold">Click to upload</span></p>
                    <p className="text-xs text-text-muted text-center px-4 mt-1">Columns: phone, name, amount (optional), date (optional)</p>
                  </div>
                  <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                </label>
              </div>

              <div className="pt-4 border-t border-border-default">
                <label className="block text-sm font-medium text-text-secondary mb-2">Or Add Manually</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Name"
                    value={manualEntry.name}
                    onChange={e => setManualEntry({...manualEntry, name: e.target.value})}
                    className="flex-1 px-3 py-1.5 text-sm border border-border-strong rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-bg"
                  />
                  <input
                    type="text"
                    placeholder="Phone"
                    value={manualEntry.phone}
                    onChange={e => setManualEntry({...manualEntry, phone: e.target.value})}
                    className="flex-1 px-3 py-1.5 text-sm border border-border-strong rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-bg"
                  />
                  <button
                    type="button"
                    onClick={handleAddManual}
                    disabled={!manualEntry.name || !manualEntry.phone}
                    className="px-4 py-1.5 bg-primary text-surface text-sm font-medium rounded-md hover:bg-primary-mid disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4 flex flex-col">
              <label className="block text-sm font-medium text-text-secondary mb-1">Or Select Recipients</label>
              <div className="flex-1 border border-border-strong rounded-md overflow-hidden flex flex-col min-h-[250px] max-h-[350px]">
                {/* Tabs */}
                <div className="flex bg-warm-white border-b border-border-strong">
                  <button
                    onClick={() => setRecipientSource('donors')}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${recipientSource === 'donors' ? 'bg-surface text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text-primary hover:bg-surface/50'}`}
                  >
                    Donors
                  </button>
                  <button
                    onClick={() => setRecipientSource('contacts')}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${recipientSource === 'contacts' ? 'bg-surface text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text-primary hover:bg-surface/50'}`}
                  >
                    Contacts
                  </button>
                </div>

                <div className="bg-surface px-4 py-2 border-b border-border-strong text-xs font-semibold text-text-secondary flex justify-between items-center">
                  <span>Available {recipientSource === 'donors' ? 'Donors' : 'Contacts'}</span>
                  <div className="flex gap-3">
                    <span 
                      className="text-primary cursor-pointer hover:underline" 
                      onClick={() => {
                        if (recipientSource === 'donors') {
                          // Select all donors
                          const newDonors = donors
                            .filter(d => !recipients.some(r => r.phone === d.phone))
                            .map(d => ({phone: d.phone, name: d.donorName || d.name || 'Unknown', amount: '₹0', date: format(new Date(), 'dd MMM yyyy')}));
                          setRecipients([...recipients, ...newDonors]);
                        } else {
                          // Select all filtered contacts
                          const filteredContacts = contactsList.filter(c => {
                            if (contactTagFilter && !c.tags.includes(contactTagFilter)) return false;
                            return (c.name || '').toLowerCase().includes(contactSearch.toLowerCase()) || (c.phone || '').includes(contactSearch);
                          });
                          const newContacts = filteredContacts
                            .filter(c => !recipients.some(r => r.phone === c.phone))
                            .map(c => ({phone: c.phone, name: c.name || 'Unknown', amount: '₹0', date: format(new Date(), 'dd MMM yyyy')}));
                          setRecipients([...recipients, ...newContacts]);
                        }
                      }}
                    >
                      Select All
                    </span>
                    <span className="text-primary cursor-pointer hover:underline" onClick={() => setRecipients([])}>
                      Deselect All
                    </span>
                  </div>
                </div>

                {recipientSource === 'donors' ? (
                  <>
                    <div className="px-3 py-2 border-b border-border-strong bg-bg">
                      <input
                        type="text"
                        placeholder="Search available donors..."
                        value={donorSearch}
                        onChange={e => setDonorSearch(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-border-strong rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                      {donors.filter(d => (d.donorName || d.name || '').toLowerCase().includes(donorSearch.toLowerCase()) || (d.phone || '').includes(donorSearch)).length === 0 ? (
                        <div className="text-center text-text-muted py-4 text-sm">No donors found</div>
                      ) : donors.filter(d => (d.donorName || d.name || '').toLowerCase().includes(donorSearch.toLowerCase()) || (d.phone || '').includes(donorSearch)).map(donor => (
                        <label key={donor.phone} className="flex items-center gap-3 p-2 hover:bg-bg rounded cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={recipients.some(r => r.phone === donor.phone)}
                            onChange={() => handleDonorSelect(donor)}
                            className="text-primary focus:ring-primary w-4 h-4 rounded border-border-strong"
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-text-primary">{donor.donorName || donor.name || 'Unknown'}</span>
                            <span className="text-xs text-text-muted">{donor.phone}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="px-3 py-2 border-b border-border-strong bg-bg flex gap-2">
                      <input
                        type="text"
                        placeholder="Search contacts..."
                        value={contactSearch}
                        onChange={e => setContactSearch(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-sm border border-border-strong rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <select 
                        value={contactTagFilter}
                        onChange={e => setContactTagFilter(e.target.value)}
                        className="w-24 md:w-32 px-2 py-1.5 text-sm border border-border-strong rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">All Tags</option>
                        {contactTags.map(tag => (
                          <option key={tag} value={tag}>{tag}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                      {contactsList.filter(c => {
                        if (contactTagFilter && !c.tags?.includes(contactTagFilter)) return false;
                        return (c.name || '').toLowerCase().includes(contactSearch.toLowerCase()) || (c.phone || '').includes(contactSearch);
                      }).length === 0 ? (
                        <div className="text-center text-text-muted py-4 text-sm">No contacts found</div>
                      ) : contactsList.filter(c => {
                        if (contactTagFilter && !c.tags?.includes(contactTagFilter)) return false;
                        return (c.name || '').toLowerCase().includes(contactSearch.toLowerCase()) || (c.phone || '').includes(contactSearch);
                      }).map(contact => (
                        <label key={contact.phone} className="flex flex-col p-2 hover:bg-bg rounded cursor-pointer transition-colors border-b border-border-default/50 last:border-0">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={recipients.some(r => r.phone === contact.phone)}
                              onChange={() => handleContactSelect(contact)}
                              className="text-primary focus:ring-primary w-4 h-4 rounded border-border-strong"
                            />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-text-primary">{contact.name || 'Unknown'}</span>
                              <span className="text-xs text-text-muted">{contact.phone}</span>
                            </div>
                          </div>
                          {contact.tags && contact.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 ml-7 mt-1">
                              {contact.tags.map(t => (
                                <span key={t} className="px-1.5 py-0.5 rounded text-[10px] bg-warm-white border border-border-default text-text-secondary">{t}</span>
                              ))}
                            </div>
                          )}
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
              
              <div className="pt-4 border-t border-border-default flex flex-col gap-4 mt-auto">
                {dailyLimitRemaining !== null && recipients.length > 0 && (
                  <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${recipients.length > dailyLimitRemaining ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold mb-1">Daily Limit Check</p>
                      <p>
                        You have <strong>{dailyLimitRemaining}</strong> messages remaining today. 
                        {recipients.length <= dailyLimitRemaining ? (
                          <span> All {recipients.length} selected recipients will be sent today.</span>
                        ) : (
                          <span> The first {dailyLimitRemaining} will be sent today, and the remaining {recipients.length - dailyLimitRemaining} will be automatically queued for tomorrow.</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <div className="text-sm font-medium text-text-primary">
                      {recipients.length} Recipient(s) Selected
                    </div>
                    {recipients.length > 0 && (
                    <button onClick={() => setShowRecipientsModal(true)} className="text-primary hover:underline text-xs text-left mt-0.5">
                      View/Edit List
                    </button>
                  )}
                </div>
                <button
                  onClick={handleLaunch}
                  disabled={loading || !selectedTemplate || recipients.length === 0}
                  className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary-mid text-surface text-sm font-medium rounded-md shadow-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? 'Launching...' : 'Launch Campaign'} <Send size={16} />
                </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-xl shadow-card border border-border-default overflow-hidden">
        <div className="p-4 border-b border-border-default bg-warm-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="font-semibold text-text-primary flex items-center gap-2">
            <BarChart2 size={20} className="text-primary" /> Campaign History
          </h2>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search campaigns..."
              value={campaignSearch}
              onChange={(e) => setCampaignSearch(e.target.value)}
              className="px-3 py-1.5 text-sm border border-border-strong rounded-md focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-auto bg-bg"
            />
            <select
              value={campaignStatus}
              onChange={(e) => setCampaignStatus(e.target.value)}
              className="px-3 py-1.5 text-sm border border-border-strong rounded-md focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-auto bg-bg"
            >
              <option value="">All Statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-md text-sm font-medium transition-colors disabled:opacity-70 flex-shrink-0"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-bg text-text-secondary text-xs uppercase border-b border-border-default">
              <tr>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Template</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Recipients</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {paginatedHistory.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-text-muted">
                    No campaigns found.
                  </td>
                </tr>
              ) : (
                paginatedHistory.map((camp, idx) => (
                  <tr key={idx} className="hover:bg-bg/50">
                    <td className="px-6 py-4 text-text-primary font-medium">{camp.campaignName || camp.campaignId}</td>
                    <td className="px-6 py-4 text-text-secondary">{camp.templateName || 'Unknown'}</td>
                    <td className="px-6 py-4 text-text-secondary">
                      {camp.scheduledAt ? format(new Date(camp.scheduledAt), 'dd MMM yyyy, HH:mm') : format(new Date(camp.createdAt || Date.now()), 'dd MMM yyyy, HH:mm')}
                    </td>
                    <td className="px-6 py-4 text-text-secondary">{camp.totalMessages || 0}</td>
                    <td className="px-6 py-4">
                      {(() => {
                        const q = camp.queued || 0;
                        const s = camp.scheduled || 0;
                        if (s > 0) return <span className="px-2 py-1 text-[10px] uppercase font-bold rounded-full bg-purple-100 text-purple-700">Scheduled ({s})</span>;
                        if (q > 0) return <span className="px-2 py-1 text-[10px] uppercase font-bold rounded-full bg-blue-100 text-blue-700">Processing {camp.totalMessages - q}/{camp.totalMessages}</span>;
                        if (camp.failed > 0) return <span className="px-2 py-1 text-[10px] uppercase font-bold rounded-full bg-danger-bg text-danger">{camp.failed} Failed</span>;
                        return <span className="px-2 py-1 text-[10px] uppercase font-bold rounded-full bg-success-bg text-success">Completed</span>;
                      })()}
                    </td>
                    <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedCampaignId(camp.campaignId)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-sm font-medium transition-colors"
                        >
                          <BarChart2 size={14} /> Dashboard
                        </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {filteredHistory.length > 0 && (
          <div className="p-4 border-t border-border-default bg-warm-white flex items-center justify-between text-sm">
            <div className="text-text-secondary">
              Showing {paginatedHistory.length} of {filteredHistory.length} campaigns
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCampaignPage(p => Math.max(1, p - 1))}
                disabled={campaignPage <= 1}
                className="px-3 py-1 border border-border-strong rounded-md hover:bg-bg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-text-primary font-medium px-2">
                Page {campaignPage} of {totalCampaignPages}
              </span>
              <button
                onClick={() => setCampaignPage(p => Math.min(totalCampaignPages, p + 1))}
                disabled={campaignPage >= totalCampaignPages}
                className="px-3 py-1 border border-border-strong rounded-md hover:bg-bg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showRecipientsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-card w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-border-default flex justify-between items-center bg-warm-white rounded-t-xl">
              <h3 className="font-semibold text-text-primary">Selected Recipients ({recipients.length})</h3>
              <button onClick={() => setShowRecipientsModal(false)} className="text-text-muted hover:text-text-primary">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {recipients.length === 0 ? (
                <div className="text-center text-text-muted text-sm py-4">No recipients added yet.</div>
              ) : recipients.map(r => (
                <div key={r.phone} className="flex justify-between items-center p-2 bg-bg rounded-lg border border-border-default">
                  <div>
                    <div className="text-sm font-medium text-text-primary">{r.name}</div>
                    <div className="text-xs text-text-muted">{r.phone}</div>
                  </div>
                  <button onClick={() => handleRemoveRecipient(r.phone)} className="text-danger hover:text-danger-dark text-xs font-medium">
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-border-default bg-bg rounded-b-xl flex justify-end">
               <button onClick={() => setShowRecipientsModal(false)} className="px-4 py-2 bg-primary hover:bg-primary-mid transition-colors text-white rounded-md text-sm">Done</button>
            </div>
          </div>
        </div>
      )}

      {selectedCampaignId && (
        <CampaignDetailsModal 
          campaignId={selectedCampaignId} 
          onClose={() => setSelectedCampaignId(null)} 
        />
      )}
    </div>
  );
}
