/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Modal } from './Modal';
import {
  getSupabaseConfig,
  saveCustomSupabaseConfig,
  clearCustomSupabaseConfig,
  testSupabaseConnection,
} from '../../services/supabaseClient';
import { DUKAANFLOW_SQL_MIGRATION, DATABASE_SECURITY_TESTS_SQL } from '../../services/sqlMigrationData';
import { Database, Copy, Check, ShieldCheck, Key, RefreshCw, ExternalLink } from 'lucide-react';

interface SupabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChanged?: () => void;
}

export const SupabaseSetupModal: React.FC<SupabaseSetupModalProps> = ({
  isOpen,
  onClose,
  onConfigChanged,
}) => {
  const currentConfig = getSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [copiedMigration, setCopiedMigration] = useState(false);
  const [copiedTests, setCopiedTests] = useState(false);
  const [activeTab, setActiveTab] = useState<'connect' | 'migration' | 'security'>('connect');

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection(url.trim(), anonKey.trim());
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Connection failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    if (url.trim() && anonKey.trim()) {
      saveCustomSupabaseConfig(url.trim(), anonKey.trim());
    } else {
      clearCustomSupabaseConfig();
    }
    onConfigChanged?.();
    onClose();
  };

  const handleCopyMigration = () => {
    navigator.clipboard.writeText(DUKAANFLOW_SQL_MIGRATION);
    setCopiedMigration(true);
    setTimeout(() => setCopiedMigration(false), 2000);
  };

  const handleCopyTests = () => {
    navigator.clipboard.writeText(DATABASE_SECURITY_TESTS_SQL);
    setCopiedTests(true);
    setTimeout(() => setCopiedTests(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Supabase PostgreSQL & Security Hub"
      subtitle="Connect live Supabase or inspect database migrations & RLS policies"
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setActiveTab('connect')}
            className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'connect'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Connection & Credentials
          </button>
          <button
            onClick={() => setActiveTab('migration')}
            className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'migration'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            SQL Schema Migration
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'security'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            RLS & Security Verification
          </button>
        </div>

        {activeTab === 'connect' && (
          <div className="space-y-5">
            {/* Status overview */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${currentConfig.isConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900">
                    {currentConfig.isConfigured
                      ? `Connected to Supabase (${currentConfig.source === 'env' ? '.env variables' : 'Custom Config'})`
                      : 'Dual Mode: Running on Persistent Local Engine (PostgreSQL Compatible)'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {currentConfig.isConfigured
                      ? 'Queries and RPCs are executing on your remote Supabase instance.'
                      : 'All tables, atomic sale transactions, stock locks, and credit ledger calculations are running locally with full persistence.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Supabase Anon Public Key</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Never use service_role key here
                  </span>
                </label>
                <input
                  type="password"
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 text-slate-800"
                />
              </div>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-lg text-xs border ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {testResult.message}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !url || !anonKey}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>Test Connection</span>
              </button>

              <div className="flex items-center gap-2">
                {currentConfig.source === 'custom' && (
                  <button
                    type="button"
                    onClick={() => {
                      clearCustomSupabaseConfig();
                      setUrl('');
                      setAnonKey('');
                      onConfigChanged?.();
                    }}
                    className="px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Disconnect
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg transition-colors whitespace-nowrap shadow-xs"
                >
                  Save & Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'migration' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-600">
                Execute this SQL in Supabase Dashboard &rarr; <strong>SQL Editor</strong> to provision all 8 tables, indexes, RLS policies, and atomic RPCs.
              </p>
              <button
                onClick={handleCopyMigration}
                className="px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                {copiedMigration ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedMigration ? 'Copied SQL!' : 'Copy SQL Script'}</span>
              </button>
            </div>

            <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-[11px] max-h-96 overflow-y-auto leading-relaxed border border-slate-800">
              <pre>{DUKAANFLOW_SQL_MIGRATION}</pre>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-4">
            <div className="p-3.5 bg-teal-50/70 border border-teal-200/80 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-teal-900 font-semibold text-xs">
                <ShieldCheck className="w-4 h-4 text-teal-700" />
                <span>Multi-Tenant Row Level Security Guarantee</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Every business record references <code>shop_id</code>. All tables enforce RLS checking that <code>shops.owner_id = auth.uid()</code>. Users cannot read, update, or forge IDs to access another shop's products, sales, customers, or credit ledgers.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-700">Verification Test Queries:</p>
              <button
                onClick={handleCopyTests}
                className="px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                {copiedTests ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedTests ? 'Copied Tests!' : 'Copy Security Tests'}</span>
              </button>
            </div>

            <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-[11px] max-h-72 overflow-y-auto leading-relaxed border border-slate-800">
              <pre>{DATABASE_SECURITY_TESTS_SQL}</pre>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
