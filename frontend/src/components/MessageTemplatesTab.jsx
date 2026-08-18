import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  MessageSquareText, Plus, Check, Edit2, Trash2, X, PlayCircle, Info, RefreshCw, Send,
  ChevronDown, ChevronRight, Image, FileText, Video, Link, Phone, Type, PlusCircle, Minus
} from 'lucide-react';
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  activateTemplate,
  deleteTemplate,
  syncMetaTemplates,
  submitToMeta
} from '../services/templateService';

const DEFAULT_TEMPLATE = {
  name: '', body: '', isActive: false, metaTemplateName: '', language: 'en', metaCategory: 'UTILITY',
  headerType: 'none', headerContent: '', footerText: '', buttons: []
};

export default function MessageTemplatesTab() {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState({ ...DEFAULT_TEMPLATE });
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Collapsible section state
  const [openSections, setOpenSections] = useState({ header: false, footer: false, buttons: false });
  
  const textareaRef = useRef(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await getTemplates();
      setTemplates(data);
    } catch (err) {
      setErrorMsg('Failed to load templates.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    setCurrentTemplate({ ...DEFAULT_TEMPLATE });
    setIsEditing(true);
    setErrorMsg('');
    setOpenSections({ header: false, footer: false, buttons: false });
  };

  const handleEdit = (template) => {
    const merged = { ...DEFAULT_TEMPLATE, ...template };
    setCurrentTemplate(merged);
    setIsEditing(true);
    setErrorMsg('');
    // Auto-open sections that have content
    setOpenSections({
      header: merged.headerType !== 'none',
      footer: !!merged.footerText,
      buttons: merged.buttons && merged.buttons.length > 0
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setCurrentTemplate({ ...DEFAULT_TEMPLATE });
    setErrorMsg('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!currentTemplate.name.trim() || !currentTemplate.body.trim() || !currentTemplate.metaTemplateName?.trim()) {
      setErrorMsg('Name, Template Name (Meta), and body are required.');
      return;
    }
    
    setIsSaving(true);
    setErrorMsg('');
    try {
      const templateData = {
        name: currentTemplate.name,
        body: currentTemplate.body,
        isActive: currentTemplate.isActive,
        metaTemplateName: currentTemplate.metaTemplateName,
        language: currentTemplate.language,
        metaCategory: currentTemplate.metaCategory,
        headerType: currentTemplate.headerType || 'none',
        headerContent: currentTemplate.headerContent || '',
        footerText: currentTemplate.footerText || '',
        buttons: currentTemplate.buttons || []
      };

      if (currentTemplate._id) {
        await updateTemplate(currentTemplate._id, templateData);
      } else {
        await createTemplate(templateData);
      }
      await fetchTemplates();
      setIsEditing(false);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to save template.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncMeta = async () => {
    setIsSyncing(true);
    try {
      await syncMetaTemplates();
      await fetchTemplates();
    } catch (err) {
      setErrorMsg('Failed to sync templates with Meta.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSubmitToMeta = async (e) => {
    if (e) e.preventDefault();
    if (!currentTemplate._id) return;
    setIsSaving(true);
    try {
      await submitToMeta(currentTemplate._id);
      await fetchTemplates();
      setIsEditing(false);
    } catch (err) {
      setErrorMsg('Failed to submit template to Meta.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleActivate = async (id) => {
    try {
      await activateTemplate(id);
      await fetchTemplates();
    } catch (err) {
      setErrorMsg('Failed to activate template.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      await deleteTemplate(id);
      await fetchTemplates();
      if (currentTemplate._id === id) {
        setIsEditing(false);
      }
    } catch (err) {
      setErrorMsg('Failed to delete template.');
    }
  };

  const insertPlaceholder = (placeholder) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setCurrentTemplate({
        ...currentTemplate,
        body: currentTemplate.body + placeholder
      });
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = currentTemplate.body;
    const newText = text.substring(0, start) + placeholder + text.substring(end);
    
    setCurrentTemplate({
      ...currentTemplate,
      body: newText
    });

    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + placeholder.length;
      textarea.focus();
    }, 0);
  };

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // --- Button helpers ---
  const addButton = () => {
    if ((currentTemplate.buttons || []).length >= 3) return;
    setCurrentTemplate({
      ...currentTemplate,
      buttons: [...(currentTemplate.buttons || []), { type: 'QUICK_REPLY', text: '', url: '', phoneNumber: '' }]
    });
    if (!openSections.buttons) setOpenSections(prev => ({ ...prev, buttons: true }));
  };

  const updateButton = (index, field, value) => {
    const updated = [...(currentTemplate.buttons || [])];
    updated[index] = { ...updated[index], [field]: value };
    setCurrentTemplate({ ...currentTemplate, buttons: updated });
  };

  const removeButton = (index) => {
    const updated = [...(currentTemplate.buttons || [])];
    updated.splice(index, 1);
    setCurrentTemplate({ ...currentTemplate, buttons: updated });
  };

  // --- Preview ---
  const previewDonorName = "Rahul Sharma";
  const previewAmount = "₹5,000";
  const previewDate = format(new Date(), 'dd MMM yyyy');

  const generatePreview = (body) => {
    if (!body) return "Template is empty...";
    return body
      .replace(/\{\{donorName\}\}/g, previewDonorName)
      .replace(/\{\{amount\}\}/g, previewAmount)
      .replace(/\{\{date\}\}/g, previewDate);
  };

  const headerMediaIcons = {
    image: <Image size={32} className="text-text-muted" />,
    video: <Video size={32} className="text-text-muted" />,
    document: <FileText size={32} className="text-text-muted" />,
  };

  // --- Section Header Component ---
  const SectionHeader = ({ label, section, icon: Icon, badge }) => (
    <button
      type="button"
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between px-4 py-2.5 bg-bg rounded-lg border border-border-default hover:border-border-strong transition-colors text-left"
    >
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-text-muted" />
        <span className="text-sm font-medium text-text-primary">{label}</span>
        {badge && <span className="text-[10px] bg-primary-light text-primary px-1.5 py-0.5 rounded-full font-semibold">{badge}</span>}
      </div>
      {openSections[section]
        ? <ChevronDown size={16} className="text-text-muted" />
        : <ChevronRight size={16} className="text-text-muted" />
      }
    </button>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto h-[calc(100vh-180px)]">
      
      {/* Left Panel: Template List */}
      <div className="w-full lg:w-1/3 flex flex-col bg-surface rounded-xl border border-border-default shadow-card overflow-hidden">
        <div className="p-4 border-b border-border-default flex justify-between items-center bg-warm-white">
          <div className="flex items-center gap-2 text-text-primary">
            <MessageSquareText size={20} className="text-primary" />
            <h2 className="font-semibold">Templates</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSyncMeta}
              disabled={isSyncing}
              title="Sync with Meta"
              className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-md transition-colors disabled:opacity-70"
            >
              <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
            </button>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary-light text-primary hover:bg-primary hover:text-white rounded-md text-sm font-medium transition-colors"
            >
              <Plus size={16} /> New
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {isLoading ? (
            <div className="text-center text-text-muted py-8 text-sm">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="text-center text-text-muted py-8 text-sm">No templates found.<br/>Create one to get started!</div>
          ) : (
            templates.map(template => (
              <motion.div
                key={template._id}
                onClick={() => !isEditing && setCurrentTemplate({ ...DEFAULT_TEMPLATE, ...template })}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg border transition-all cursor-pointer ${
                  template.isActive 
                    ? 'border-success bg-success-bg/30 shadow-sm' 
                    : 'border-border-default bg-bg hover:border-primary/50'
                } ${currentTemplate._id === template._id ? 'ring-1 ring-primary/50' : ''}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col gap-1 pr-2">
                    <h3 className="font-medium text-text-primary truncate" title={template.name}>
                      {template.name}
                    </h3>
                    {template.metaStatus && (
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full self-start ${
                        template.metaStatus.toUpperCase() === 'APPROVED' ? 'bg-success/20 text-success' :
                        template.metaStatus.toUpperCase() === 'PENDING' ? 'bg-warning/20 text-warning' :
                        template.metaStatus.toUpperCase() === 'REJECTED' ? 'bg-danger/20 text-danger' :
                        'bg-border-strong text-text-secondary'
                      }`}>
                        Meta: {template.metaStatus}
                      </span>
                    )}
                  </div>
                  {template.isActive && (
                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold bg-success text-white px-2 py-0.5 rounded-full shrink-0">
                      <Check size={10} strokeWidth={3} /> Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted line-clamp-2 mb-3">
                  {template.body}
                </p>
                <div className="flex justify-between items-center border-t border-border-strong/50 pt-3">
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleEdit(template); }}
                      className="p-1.5 text-text-muted hover:text-primary hover:bg-primary-light rounded transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(template._id); }}
                      className="p-1.5 text-text-muted hover:text-danger hover:bg-danger-bg rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {!template.isActive && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleActivate(template._id); }}
                      className="text-xs font-medium text-text-secondary hover:text-success border border-border-strong hover:border-success px-2 py-1 rounded transition-colors"
                    >
                      Set Active
                    </button>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Right Panel: Editor */}
      <div className="w-full lg:w-2/3 flex flex-col bg-surface rounded-xl border border-border-default shadow-card overflow-hidden">
        {isEditing ? (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-border-default flex justify-between items-center bg-warm-white">
              <h2 className="font-semibold text-text-primary flex items-center gap-2">
                {currentTemplate._id ? 'Edit Template' : 'New Template'}
              </h2>
              <button onClick={handleCancelEdit} className="text-text-muted hover:text-text-primary transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col no-scrollbar">
              <AnimatePresence>
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-danger-bg text-danger border border-danger/20 p-3 rounded-lg mb-6 text-sm"
                  >
                    {errorMsg}
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSave} className="flex flex-col gap-5 flex-1">
                {/* --- Basic Info --- */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Display Name *</label>
                  <input
                    type="text"
                    required
                    value={currentTemplate.name}
                    onChange={e => setCurrentTemplate({...currentTemplate, name: e.target.value})}
                    placeholder="e.g. Formal Thank You"
                    className="w-full px-4 py-2 border border-border-strong rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-bg text-text-primary"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-text-secondary mb-1">Meta Template Name *</label>
                    <input
                      type="text"
                      required
                      value={currentTemplate.metaTemplateName || ''}
                      onChange={e => setCurrentTemplate({...currentTemplate, metaTemplateName: e.target.value})}
                      placeholder="e.g. formal_thank_you"
                      className="w-full px-4 py-2 border border-border-strong rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-bg text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Language</label>
                    <select
                      value={currentTemplate.language || 'en'}
                      onChange={e => setCurrentTemplate({...currentTemplate, language: e.target.value})}
                      className="w-full px-4 py-2 border border-border-strong rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-bg text-text-primary"
                    >
                      <option value="en">English (en)</option>
                      <option value="ml">Malayalam (ml)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Category</label>
                    <select
                      value={currentTemplate.metaCategory || 'UTILITY'}
                      onChange={e => setCurrentTemplate({...currentTemplate, metaCategory: e.target.value})}
                      className="w-full px-4 py-2 border border-border-strong rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-bg text-text-primary"
                    >
                      <option value="UTILITY">UTILITY</option>
                      <option value="MARKETING">MARKETING</option>
                    </select>
                  </div>
                </div>

                {/* ═══════════════════════════════════════════════════════ */}
                {/* HEADER SECTION */}
                {/* ═══════════════════════════════════════════════════════ */}
                <div>
                  <SectionHeader
                    label="Header"
                    section="header"
                    icon={Type}
                    badge={currentTemplate.headerType !== 'none' ? currentTemplate.headerType.toUpperCase() : null}
                  />
                  {openSections.header && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 p-4 border border-border-default rounded-lg bg-warm-white space-y-3"
                    >
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">Header Type</label>
                        <select
                          value={currentTemplate.headerType || 'none'}
                          onChange={e => setCurrentTemplate({ ...currentTemplate, headerType: e.target.value, headerContent: '' })}
                          className="w-full px-3 py-2 text-sm border border-border-strong rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-surface"
                        >
                          <option value="none">None</option>
                          <option value="text">Text</option>
                          <option value="image">Image</option>
                          <option value="video">Video</option>
                          <option value="document">Document (PDF)</option>
                        </select>
                      </div>

                      {currentTemplate.headerType === 'text' && (
                        <div>
                          <label className="block text-xs font-medium text-text-secondary mb-1">Header Text <span className="text-text-muted">(max 60 chars)</span></label>
                          <input
                            type="text"
                            maxLength={60}
                            value={currentTemplate.headerContent || ''}
                            onChange={e => setCurrentTemplate({ ...currentTemplate, headerContent: e.target.value })}
                            placeholder="e.g. Thank you for your donation!"
                            className="w-full px-3 py-2 text-sm border border-border-strong rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-surface"
                          />
                          <p className="text-xs text-text-muted mt-1 text-right">{(currentTemplate.headerContent || '').length}/60</p>
                        </div>
                      )}

                      {['image', 'video', 'document'].includes(currentTemplate.headerType) && (
                        <div>
                          <label className="block text-xs font-medium text-text-secondary mb-1">
                            {currentTemplate.headerType === 'image' && 'Image URL'}
                            {currentTemplate.headerType === 'video' && 'Video URL'}
                            {currentTemplate.headerType === 'document' && 'Document URL (PDF)'}
                          </label>
                          <div className="flex items-center gap-2">
                            <Link size={14} className="text-text-muted shrink-0" />
                            <input
                              type="url"
                              value={currentTemplate.headerContent || ''}
                              onChange={e => setCurrentTemplate({ ...currentTemplate, headerContent: e.target.value })}
                              placeholder="https://example.com/file.jpg"
                              className="w-full px-3 py-2 text-sm border border-border-strong rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-surface"
                            />
                          </div>
                          <p className="text-xs text-text-muted mt-1">Paste a publicly hosted URL for this media.</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* ═══════════════════════════════════════════════════════ */}
                {/* BODY SECTION (always visible) */}
                {/* ═══════════════════════════════════════════════════════ */}
                <div className="flex flex-col flex-1">
                  <div className="flex justify-between items-end mb-1">
                    <label className="block text-sm font-medium text-text-secondary">Message Body *</label>
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      <button type="button" onClick={() => insertPlaceholder('{{donorName}}')} className="text-xs bg-info-bg text-info hover:bg-info/20 px-2 py-1 rounded border border-info/20 transition-colors">
                        {`{{donorName}}`}
                      </button>
                      <button type="button" onClick={() => insertPlaceholder('{{amount}}')} className="text-xs bg-info-bg text-info hover:bg-info/20 px-2 py-1 rounded border border-info/20 transition-colors">
                        {`{{amount}}`}
                      </button>
                      <button type="button" onClick={() => insertPlaceholder('{{date}}')} className="text-xs bg-info-bg text-info hover:bg-info/20 px-2 py-1 rounded border border-info/20 transition-colors">
                        {`{{date}}`}
                      </button>
                    </div>
                  </div>
                  <textarea
                    ref={textareaRef}
                    required
                    value={currentTemplate.body}
                    onChange={e => setCurrentTemplate({...currentTemplate, body: e.target.value})}
                    placeholder="Type your message here. Click placeholders to insert them..."
                    maxLength={1024}
                    className="w-full flex-1 min-h-[120px] p-4 border border-border-strong rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-bg resize-none text-text-primary font-sans leading-relaxed whitespace-pre-wrap"
                  />
                  <p className="text-xs text-text-muted mt-1 text-right">{(currentTemplate.body || '').length}/1024</p>
                </div>

                {/* ═══════════════════════════════════════════════════════ */}
                {/* FOOTER SECTION */}
                {/* ═══════════════════════════════════════════════════════ */}
                <div>
                  <SectionHeader
                    label="Footer"
                    section="footer"
                    icon={FileText}
                    badge={currentTemplate.footerText ? 'SET' : null}
                  />
                  {openSections.footer && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 p-4 border border-border-default rounded-lg bg-warm-white"
                    >
                      <label className="block text-xs font-medium text-text-secondary mb-1">Footer Text <span className="text-text-muted">(max 60 chars, no variables)</span></label>
                      <input
                        type="text"
                        maxLength={60}
                        value={currentTemplate.footerText || ''}
                        onChange={e => setCurrentTemplate({ ...currentTemplate, footerText: e.target.value })}
                        placeholder="e.g. Powered by Our Charity Org"
                        className="w-full px-3 py-2 text-sm border border-border-strong rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-surface"
                      />
                      <p className="text-xs text-text-muted mt-1 text-right">{(currentTemplate.footerText || '').length}/60</p>
                    </motion.div>
                  )}
                </div>

                {/* ═══════════════════════════════════════════════════════ */}
                {/* BUTTONS SECTION */}
                {/* ═══════════════════════════════════════════════════════ */}
                <div>
                  <SectionHeader
                    label="Buttons"
                    section="buttons"
                    icon={PlusCircle}
                    badge={(currentTemplate.buttons || []).length > 0 ? `${(currentTemplate.buttons || []).length}` : null}
                  />
                  {openSections.buttons && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 p-4 border border-border-default rounded-lg bg-warm-white space-y-3"
                    >
                      {(currentTemplate.buttons || []).map((btn, i) => (
                        <div key={i} className="p-3 bg-surface border border-border-default rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Button {i + 1}</span>
                            <button
                              type="button"
                              onClick={() => removeButton(i)}
                              className="text-text-muted hover:text-danger p-1 rounded transition-colors"
                              title="Remove button"
                            >
                              <Minus size={14} />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-text-muted mb-0.5">Type</label>
                              <select
                                value={btn.type}
                                onChange={e => updateButton(i, 'type', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-border-strong rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-bg"
                              >
                                <option value="QUICK_REPLY">Quick Reply</option>
                                <option value="URL">URL</option>
                                <option value="PHONE_NUMBER">Phone Number</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-text-muted mb-0.5">Label <span className="text-text-muted">(max 25)</span></label>
                              <input
                                type="text"
                                maxLength={25}
                                value={btn.text}
                                onChange={e => updateButton(i, 'text', e.target.value)}
                                placeholder="Button text"
                                className="w-full px-2 py-1.5 text-sm border border-border-strong rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-bg"
                              />
                            </div>
                          </div>
                          {btn.type === 'URL' && (
                            <div>
                              <label className="block text-xs text-text-muted mb-0.5">URL</label>
                              <div className="flex items-center gap-2">
                                <Link size={12} className="text-text-muted shrink-0" />
                                <input
                                  type="url"
                                  value={btn.url || ''}
                                  onChange={e => updateButton(i, 'url', e.target.value)}
                                  placeholder="https://example.com"
                                  className="w-full px-2 py-1.5 text-sm border border-border-strong rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-bg"
                                />
                              </div>
                            </div>
                          )}
                          {btn.type === 'PHONE_NUMBER' && (
                            <div>
                              <label className="block text-xs text-text-muted mb-0.5">Phone Number</label>
                              <div className="flex items-center gap-2">
                                <Phone size={12} className="text-text-muted shrink-0" />
                                <input
                                  type="text"
                                  value={btn.phoneNumber || ''}
                                  onChange={e => updateButton(i, 'phoneNumber', e.target.value)}
                                  placeholder="+919876543210"
                                  className="w-full px-2 py-1.5 text-sm border border-border-strong rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-bg"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {(currentTemplate.buttons || []).length < 3 && (
                        <button
                          type="button"
                          onClick={addButton}
                          className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-primary bg-primary-light hover:bg-primary hover:text-white border border-primary/20 rounded-lg transition-colors"
                        >
                          <PlusCircle size={16} /> Add Button
                        </button>
                      )}
                      {(currentTemplate.buttons || []).length >= 3 && (
                        <p className="text-xs text-text-muted text-center">Maximum 3 buttons allowed by WhatsApp.</p>
                      )}
                    </motion.div>
                  )}
                </div>
                
                {/* --- Active toggle --- */}
                <div className="flex items-center gap-2 mt-2">
                   <input
                     type="checkbox"
                     id="isActiveToggle"
                     checked={currentTemplate.isActive}
                     onChange={e => setCurrentTemplate({...currentTemplate, isActive: e.target.checked})}
                     className="w-4 h-4 text-primary bg-bg border-border-strong rounded focus:ring-primary"
                   />
                   <label htmlFor="isActiveToggle" className="text-sm text-text-secondary cursor-pointer select-none">
                     Set as Active Template (will deactivate others)
                   </label>
                </div>

                {/* --- Action Buttons --- */}
                <div className="pt-4 flex justify-between gap-3 mt-auto border-t border-border-default pt-4">
                  <div className="flex gap-2">
                    {currentTemplate._id && (!currentTemplate.metaStatus || currentTemplate.metaStatus.toUpperCase() === 'DRAFT' || currentTemplate.metaStatus.toUpperCase() === 'REJECTED') && (
                      <button
                        type="button"
                        onClick={handleSubmitToMeta}
                        disabled={isSaving}
                        className="flex items-center gap-1 px-4 py-2 text-sm font-medium bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 rounded-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        <Send size={16} /> Submit to Meta
                      </button>
                    )}
                    {currentTemplate._id && (
                      <button
                        type="button"
                        onClick={() => handleDelete(currentTemplate._id)}
                        disabled={isSaving}
                        className="flex items-center gap-1 px-4 py-2 text-sm font-medium bg-danger-bg text-danger border border-danger/20 hover:bg-danger/10 rounded-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-2 bg-primary hover:bg-primary-mid text-surface text-sm font-medium rounded-md shadow-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isSaving ? 'Saving...' : 'Save Template'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
            
            {/* ═══════════════════════════════════════════════════════ */}
            {/* LIVE PREVIEW */}
            {/* ═══════════════════════════════════════════════════════ */}
            <div className="border-t border-border-default bg-[#EFEAE2] flex flex-col" style={{ minHeight: '220px' }}>
              <div className="px-4 py-2 bg-[#D1C6B5]/30 flex items-center gap-2 border-b border-border-strong/20">
                <PlayCircle size={14} className="text-text-secondary" />
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Live Preview</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
                <div className="inline-block max-w-[85%] relative">
                  <div className="bg-white rounded-xl rounded-tl-sm shadow-sm overflow-hidden border border-black/5">
                    {/* Preview Header */}
                    {currentTemplate.headerType && currentTemplate.headerType !== 'none' && (
                      <div>
                        {currentTemplate.headerType === 'text' && currentTemplate.headerContent && (
                          <div className="px-3 pt-3 pb-0">
                            <p className="font-bold text-sm text-[#111B21]">{currentTemplate.headerContent}</p>
                          </div>
                        )}
                        {currentTemplate.headerType === 'image' && (
                          <div className="bg-[#E9E3D8] flex items-center justify-center h-32 rounded-t-xl">
                            {currentTemplate.headerContent ? (
                              <img src={currentTemplate.headerContent} alt="Header" className="w-full h-full object-cover rounded-t-xl" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                            ) : null}
                            <div className={`flex flex-col items-center gap-1 text-text-muted ${currentTemplate.headerContent ? 'hidden' : 'flex'}`}>
                              <Image size={28} />
                              <span className="text-xs">Image</span>
                            </div>
                          </div>
                        )}
                        {currentTemplate.headerType === 'video' && (
                          <div className="bg-[#E9E3D8] flex flex-col items-center justify-center h-32 gap-1 text-text-muted rounded-t-xl">
                            <Video size={28} />
                            <span className="text-xs">Video</span>
                          </div>
                        )}
                        {currentTemplate.headerType === 'document' && (
                          <div className="bg-[#E9E3D8] flex flex-col items-center justify-center h-20 gap-1 text-text-muted rounded-t-xl">
                            <FileText size={24} />
                            <span className="text-xs">Document (PDF)</span>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Preview Body */}
                    <div className="p-3 whitespace-pre-wrap text-sm text-[#111B21]">
                      {generatePreview(currentTemplate.body)}
                    </div>
                    {/* Preview Footer */}
                    {currentTemplate.footerText && (
                      <div className="px-3 pb-2">
                        <p className="text-xs text-[#8696A0]">{currentTemplate.footerText}</p>
                      </div>
                    )}
                  </div>
                  {/* Preview Buttons */}
                  {(currentTemplate.buttons || []).length > 0 && (
                    <div className="mt-1 space-y-1">
                      {(currentTemplate.buttons || []).map((btn, i) => (
                        <div key={i} className="bg-white rounded-lg shadow-sm border border-black/5 text-center py-2 px-3">
                          <span className="text-sm font-medium text-[#00A5E0] flex items-center justify-center gap-1.5">
                            {btn.type === 'URL' && <Link size={13} />}
                            {btn.type === 'PHONE_NUMBER' && <Phone size={13} />}
                            {btn.text || 'Button'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* WhatsApp tail */}
                  <div className="absolute top-0 -left-2 w-0 h-0 border-t-[0px] border-t-transparent border-r-[12px] border-r-white border-b-[12px] border-b-transparent"></div>
                </div>
              </div>
            </div>
          </div>
        ) : currentTemplate._id ? (
          /* ═══════════════════════════════════════════════════════ */
          /* READ-ONLY PREVIEW for selected template */
          /* ═══════════════════════════════════════════════════════ */
          <div className="flex flex-col h-full bg-[#EFEAE2]">
            <div className="p-4 border-b border-border-default bg-warm-white flex justify-between items-center">
              <h2 className="font-semibold text-text-primary flex items-center gap-2">
                Template Preview
              </h2>
              <button
                onClick={() => handleEdit(currentTemplate)}
                className="flex items-center gap-1 px-4 py-1.5 bg-primary text-surface hover:bg-primary-mid rounded-md text-sm font-medium transition-colors"
              >
                <Edit2 size={14} /> Edit Template
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 flex justify-center items-start">
              <div className="inline-block max-w-md w-full relative">
                <div className="bg-white rounded-xl rounded-tl-sm shadow-sm overflow-hidden border border-black/5">
                  {/* Header */}
                  {currentTemplate.headerType && currentTemplate.headerType !== 'none' && (
                    <div>
                      {currentTemplate.headerType === 'text' && currentTemplate.headerContent && (
                        <div className="px-4 pt-4 pb-0">
                          <p className="font-bold text-[#111B21]">{currentTemplate.headerContent}</p>
                        </div>
                      )}
                      {currentTemplate.headerType === 'image' && (
                        <div className="bg-[#E9E3D8] flex items-center justify-center h-40">
                          {currentTemplate.headerContent ? (
                            <img src={currentTemplate.headerContent} alt="Header" className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center gap-1 text-text-muted"><Image size={32} /><span className="text-xs">Image</span></div>
                          )}
                        </div>
                      )}
                      {currentTemplate.headerType === 'video' && (
                        <div className="bg-[#E9E3D8] flex flex-col items-center justify-center h-40 gap-1 text-text-muted"><Video size={32} /><span className="text-xs">Video</span></div>
                      )}
                      {currentTemplate.headerType === 'document' && (
                        <div className="bg-[#E9E3D8] flex flex-col items-center justify-center h-24 gap-1 text-text-muted"><FileText size={28} /><span className="text-xs">Document (PDF)</span></div>
                      )}
                    </div>
                  )}
                  <div className="p-4 whitespace-pre-wrap text-[#111B21]">
                    {generatePreview(currentTemplate.body)}
                  </div>
                  {currentTemplate.footerText && (
                    <div className="px-4 pb-3">
                      <p className="text-xs text-[#8696A0]">{currentTemplate.footerText}</p>
                    </div>
                  )}
                </div>
                {(currentTemplate.buttons || []).length > 0 && (
                  <div className="mt-1 space-y-1">
                    {(currentTemplate.buttons || []).map((btn, i) => (
                      <div key={i} className="bg-white rounded-lg shadow-sm border border-black/5 text-center py-2.5 px-3">
                        <span className="text-sm font-medium text-[#00A5E0] flex items-center justify-center gap-1.5">
                          {btn.type === 'URL' && <Link size={13} />}
                          {btn.type === 'PHONE_NUMBER' && <Phone size={13} />}
                          {btn.text || 'Button'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="absolute top-0 -left-2 w-0 h-0 border-t-[0px] border-t-transparent border-r-[12px] border-r-white border-b-[12px] border-b-transparent"></div>
              </div>
            </div>
          </div>
        ) : (
          /* ═══════════════════════════════════════════════════════ */
          /* EMPTY STATE */
          /* ═══════════════════════════════════════════════════════ */
          <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-warm-white/50">
            <div className="w-16 h-16 bg-primary-light text-primary rounded-full flex items-center justify-center mb-4 opacity-80">
              <MessageSquareText size={32} />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">Select a template</h3>
            <p className="text-text-muted text-sm max-w-sm mb-6">
              Choose a template from the list to view or edit, or create a new one to customize your WhatsApp thank-you messages.
            </p>
            <div className="flex items-center gap-2 text-xs text-info bg-info-bg px-3 py-2 rounded-md border border-info/20">
              <Info size={14} />
              <span>Only one template can be active at a time.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
