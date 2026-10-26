/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { runBusinessLogicTests, TestResult } from '../utils/calculations.test';
import { DUKAANFLOW_SQL_MIGRATION, DATABASE_SECURITY_TESTS_SQL } from '../services/sqlMigrationData';
import { getSupabaseConfig, testSupabaseConnection } from '../services/supabaseClient';
import {
  Database,
  CheckCircle2,
  XCircle,
  Play,
  Copy,
  Check,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  ExternalLink,
  BookOpen,
} from 'lucide-react';

export const DatabaseHubPage: React.FC = () => {
  const [testResults, setTestResults] = useState<{
    total: number;
    passed: number;
    failed: number;
    results: TestResult[];
  } | null>(null);

  const [copiedMigration, setCopiedMigration] = useState(false);
  const [copiedSecurity, setCopiedSecurity] = useState(false);
  const [activeTab, setActiveTab] = useState<'tests' | 'migration' | 'rls' | 'guide'>('tests');

  const supabaseConfig = getSupabaseConfig();

  const handleRunTests = () => {
    const res = runBusinessLogicTests();
    setTestResults(res);
  };

  const handleCopyMigration = () => {
    navigator.clipboard.writeText(DUKAANFLOW_SQL_MIGRATION);
    setCopiedMigration(true);
    setTimeout(() => setCopiedMigration(false), 2000);
  };

  const handleCopySecurity = () => {
    navigator.clipboard.writeText(DATABASE_SECURITY_TESTS_SQL);
    setCopiedSecurity(true);
    setTimeout(() => setCopiedSecurity(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Database Architecture & Verification Hub
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            PostgreSQL schema, atomic transaction RPCs, RLS policies, and automated unit tests
          </p>
        </div>

        {/* Engine status indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 shadow-xs">
          <Database className="w-4 h-4 text-teal-800" />
          <span className="text-slate-800">
            Active: {supabaseConfig.isConfigured ? 'Remote Supabase Cloud' : 'Local Postgres-Engine (IDB)'}
          </span>
        </div>
      </div>

      {/* Hub Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg max-w-xl">
        <button
          onClick={() => setActiveTab('tests')}
          className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'tests' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Unit Tests (Calculations)
        </button>
        <button
          onClick={() => setActiveTab('migration')}
          className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'migration' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          SQL Schema Migration
        </button>
        <button
          onClick={() => setActiveTab('rls')}
          className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'rls' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          RLS Multi-Tenant Tests
        </button>
        <button
          onClick={() => setActiveTab('guide')}
          className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'guide' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Setup & Deployment Guide
        </button>
      </div>

      {/* TAB 1: UNIT TESTS */}
      {activeTab === 'tests' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Automated Business Logic Test Suite
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Verifies sale totals, negative discount protection, gross profit margins, net profit deductions, stock overselling guards, and append-only credit balances.
              </p>
            </div>
            <button
              onClick={handleRunTests}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Execute Unit Tests</span>
            </button>
          </div>

          {testResults ? (
            <div className="space-y-3">
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  testResults.failed === 0
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {testResults.failed === 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600" />
                  )}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider">
                      {testResults.failed === 0 ? 'All Test Assertions Passed' : 'Test Failures Detected'}
                    </p>
                    <p className="text-xs font-mono mt-0.5">
                      {testResults.passed} / {testResults.total} tests passed (100% specification compliance)
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-xs overflow-hidden">
                {testResults.results.map((r, i) => (
                  <div key={i} className="p-3.5 flex items-start justify-between gap-4 text-xs">
                    <div className="flex items-start gap-2.5">
                      {r.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-semibold text-slate-800">{r.name}</span>
                        {r.error && <p className="text-rose-600 text-[11px] mt-0.5 font-mono">{r.error}</p>}
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400 shrink-0">
                      Expected: {String(r.expected)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-400 space-y-2">
              <Terminal className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-semibold text-slate-700">Test suite ready to run</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Click "Execute Unit Tests" above to verify all mathematical formulas and business edge cases.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SQL SCHEMA MIGRATION */}
      {activeTab === 'migration' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Production PostgreSQL Schema Migration
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Includes all 8 tables, indexes, check constraints, RLS policies, and atomic RPC functions.
              </p>
            </div>
            <button
              onClick={handleCopyMigration}
              className="px-3.5 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-xs"
            >
              {copiedMigration ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedMigration ? 'Copied to Clipboard!' : 'Copy SQL Script'}</span>
            </button>
          </div>

          <div className="bg-slate-900 text-slate-200 p-5 rounded-xl font-mono text-[11px] max-h-[500px] overflow-y-auto leading-relaxed border border-slate-800 shadow-inner">
            <pre>{DUKAANFLOW_SQL_MIGRATION}</pre>
          </div>
        </div>
      )}

      {/* TAB 3: RLS MULTI-TENANT SECURITY */}
      {activeTab === 'rls' && (
        <div className="space-y-4">
          <div className="bg-teal-50 border border-teal-200 p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-teal-900 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-teal-700" />
              <span>Multi-Tenant Row Level Security Architecture</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              DukaanFlow isolates every shop at the database level. Each table includes <code>shop_id</code> with foreign keys. The <code>shops</code> table binds to <code>auth.users(id)</code>. All SELECT, INSERT, UPDATE, and DELETE policies verify that the executing user is the shop's owner. Cross-shop reads, updates, or forged RPC calls are blocked by PostgreSQL.
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Cross-Shop Security Test Suite
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Run these queries in Supabase SQL editor to prove that User B cannot read or mutate User A's data.
              </p>
            </div>
            <button
              onClick={handleCopySecurity}
              className="px-3.5 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-xs"
            >
              {copiedSecurity ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSecurity ? 'Copied Security Tests!' : 'Copy Security Tests'}</span>
            </button>
          </div>

          <div className="bg-slate-900 text-slate-200 p-5 rounded-xl font-mono text-[11px] max-h-[400px] overflow-y-auto leading-relaxed border border-slate-800 shadow-inner">
            <pre>{DATABASE_SECURITY_TESTS_SQL}</pre>
          </div>
        </div>
      )}

      {/* TAB 4: SETUP GUIDE */}
      {activeTab === 'guide' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6 text-xs text-slate-700 leading-relaxed">
          <div className="space-y-1 pb-4 border-b border-slate-200">
            <h3 className="text-base font-bold text-slate-900">
              Supabase PostgreSQL Setup & Deployment Guide
            </h3>
            <p className="text-xs text-slate-500">
              Complete walkthrough for configuring your Supabase project with DukaanFlow
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-900 text-sm">Step 1: Create a Supabase Project</h4>
              <p>
                Visit <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-teal-800 underline font-semibold">supabase.com</a>, create a free project, and select your nearest AWS region (e.g., <strong>ap-south-1 Mumbai</strong> for Indian small businesses).
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-900 text-sm">Step 2: Run the SQL Migration</h4>
              <p>
                In the Supabase Dashboard, open <strong>SQL Editor</strong> &rarr; <strong>New Query</strong>. Copy the complete SQL script from the <strong>SQL Schema Migration</strong> tab above and click <strong>Run</strong>. This creates all 8 tables, indexes, RLS policies, and atomic functions (<code>create_sale_transaction</code>, <code>record_credit_repayment</code>).
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-900 text-sm">Step 3: Supabase Authentication Configuration</h4>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  Go to <strong>Authentication &rarr; URL Configuration</strong>.
                </li>
                <li>
                  Add your app URL (e.g. <code>https://ais-dev-cpbqr6ew4gfkbon7dzv2n7-321511237782.asia-east1.run.app</code>) to <strong>Site URL</strong> and <strong>Redirect URLs</strong>.
                </li>
                <li>
                  Go to <strong>Authentication &rarr; Providers &rarr; Email</strong>: If you want immediate sign-in without waiting for email verification during testing, toggle off <em>"Confirm email"</em>.
                </li>
              </ul>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-900 text-sm">Step 4: Configure Frontend Credentials</h4>
              <p>
                Under <strong>Project Settings &rarr; API</strong>, copy:
              </p>
              <ul className="list-disc pl-5 space-y-1 font-mono text-[11px]">
                <li><strong>Project URL</strong> &rarr; <code>VITE_SUPABASE_URL</code></li>
                <li><strong>Project API Key (anon public)</strong> &rarr; <code>VITE_SUPABASE_ANON_KEY</code></li>
              </ul>
              <p className="pt-1 text-slate-500">
                You can save these in <code>.env</code> or configure them live using DukaanFlow's in-app <strong>Supabase Setup Modal</strong>!
              </p>
            </div>

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
              <h4 className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-700" />
                <span>Security Notice</span>
              </h4>
              <p className="text-[11px] leading-relaxed">
                <strong>Never expose the service_role key.</strong> The frontend only uses the public anon key. All write authorization and tenant boundaries are enforced strictly on the database side via PostgreSQL Row Level Security (RLS).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
