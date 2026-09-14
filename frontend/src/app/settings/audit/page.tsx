'use client';

import React, { useState, useEffect } from 'react';
import { getAuditSettings, updateAuditSettings, AuditSetting } from '@/features/audit/api/audit.api';
import { Loader2, Database, Save, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export default function AuditSettingsPage() {
  const [settings, setSettings] = useState<AuditSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await getAuditSettings();
      setSettings(data);
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Failed to load audit settings', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (setting: AuditSetting) => {
    try {
      setSaving(setting.entityName);
      const updated = await updateAuditSettings(setting.entityName, {
        isActive: !setting.isActive
      });
      
      setSettings(prev => prev.map(s => s.entityName === setting.entityName ? { ...s, isActive: updated.isActive } : s));
      setMessage({ text: `Updated ${setting.entityName} audit tracking`, type: 'success' });
    } catch (err) {
      setMessage({ text: 'Failed to update setting', type: 'error' });
    } finally {
      setSaving(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading audit configuration...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
            <Database className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Audit Trail Configuration</h1>
            <p className="text-sm text-slate-500 mt-1">Configure which modules should actively track field-level changes.</p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium text-sm">{message.text}</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-xs">
            <tr>
              <th className="px-6 py-4">Module (Entity Name)</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Tracking Mode</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {settings.map((setting) => (
              <tr key={setting.entityName} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-semibold text-slate-700">
                  {setting.entityName}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${setting.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {setting.isActive ? 'TRACKING' : 'DISABLED'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-slate-500 text-xs">
                    {setting.trackAllFields ? 'All Fields (Except Ignored)' : 'Specific Fields Only'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleToggleActive(setting)}
                    disabled={saving === setting.entityName}
                    className={`inline-flex items-center justify-center px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                      setting.isActive 
                        ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                        : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                    }`}
                  >
                    {saving === setting.entityName ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      setting.isActive ? 'Disable Tracking' : 'Enable Tracking'
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
