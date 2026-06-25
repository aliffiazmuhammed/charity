import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { MessageSquareText, Plus, Check, Edit2, Trash2, X, PlayCircle, Info } from 'lucide-react';
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  activateTemplate,
  deleteTemplate
} from '../services/templateService';

export default function MessageTemplatesTab() {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState({ name: '', body: '', isActive: false });
  const [isSaving, setIsSaving] = useState(false);
  
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
    setCurrentTemplate({ name: '', body: '', isActive: false });
    setIsEditing(true);
    setErrorMsg('');
  };

  const handleEdit = (template) => {
    setCurrentTemplate({ ...template });
    setIsEditing(true);
    setErrorMsg('');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setCurrentTemplate({ name: '', body: '', isActive: false });
    setErrorMsg('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!currentTemplate.name.trim() || !currentTemplate.body.trim()) {
      setErrorMsg('Name and body are required.');
      return;
    }
    
    setIsSaving(true);
    setErrorMsg('');
    try {
      if (currentTemplate._id) {
        await updateTemplate(currentTemplate._id, {
          name: currentTemplate.name,
          body: currentTemplate.body,
          isActive: currentTemplate.isActive
        });
      } else {
        await createTemplate({
          name: currentTemplate.name,
          body: currentTemplate.body,
          isActive: currentTemplate.isActive
        });
      }
      await fetchTemplates();
      setIsEditing(false);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to save template.');
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

    // Set cursor position after placeholder
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + placeholder.length;
      textarea.focus();
    }, 0);
  };

  // Preview data
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

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto h-[calc(100vh-180px)]">
      
      {/* Left Panel: Template List */}
      <div className="w-full lg:w-1/3 flex flex-col bg-surface rounded-xl border border-border-default shadow-card overflow-hidden">
        <div className="p-4 border-b border-border-default flex justify-between items-center bg-warm-white">
          <div className="flex items-center gap-2 text-text-primary">
            <MessageSquareText size={20} className="text-primary" />
            <h2 className="font-semibold">Templates</h2>
          </div>
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary-light text-primary hover:bg-primary hover:text-white rounded-md text-sm font-medium transition-colors"
          >
            <Plus size={16} /> New
          </button>
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
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg border transition-all ${
                  template.isActive 
                    ? 'border-success bg-success-bg/30 shadow-sm' 
                    : 'border-border-default bg-bg hover:border-primary/50'
                } ${currentTemplate._id === template._id ? 'ring-1 ring-primary/50' : ''}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-text-primary truncate pr-2" title={template.name}>
                    {template.name}
                  </h3>
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
                      onClick={() => handleEdit(template)}
                      className="p-1.5 text-text-muted hover:text-primary hover:bg-primary-light rounded transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDelete(template._id)}
                      className="p-1.5 text-text-muted hover:text-danger hover:bg-danger-bg rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {!template.isActive && (
                    <button 
                      onClick={() => handleActivate(template._id)}
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
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Template Name *</label>
                  <input
                    type="text"
                    required
                    value={currentTemplate.name}
                    onChange={e => setCurrentTemplate({...currentTemplate, name: e.target.value})}
                    placeholder="e.g. Formal Thank You"
                    className="w-full px-4 py-2 border border-border-strong rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-bg text-text-primary"
                  />
                </div>

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
                    className="w-full flex-1 min-h-[150px] p-4 border border-border-strong rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-bg resize-none text-text-primary font-sans leading-relaxed whitespace-pre-wrap"
                  />
                </div>
                
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

                <div className="pt-4 flex justify-end gap-3 mt-auto border-t border-border-default pt-4">
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
              </form>
            </div>
            
            {/* Live Preview Pane */}
            <div className="h-48 border-t border-border-default bg-[#EFEAE2] flex flex-col">
              <div className="px-4 py-2 bg-[#D1C6B5]/30 flex items-center gap-2 border-b border-border-strong/20">
                <PlayCircle size={14} className="text-text-secondary" />
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Live Preview</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
                <div className="bg-white rounded-xl rounded-tl-sm shadow-sm p-3 inline-block max-w-[85%] relative border border-black/5 whitespace-pre-wrap text-sm text-[#111B21]">
                  {generatePreview(currentTemplate.body)}
                  {/* Fake WhatsApp tail */}
                  <div className="absolute top-0 -left-2 w-0 h-0 border-t-[0px] border-t-transparent border-r-[12px] border-r-white border-b-[12px] border-b-transparent"></div>
                </div>
              </div>
            </div>
          </div>
        ) : (
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
