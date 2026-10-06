/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppStoreProvider, useAppStore, useT, useRequirementsStatus } from './store';
import Header from './components/Header';
import TenderDetails from './components/TenderDetails';
import FileList from './components/FileList';
import RequirementsList from './components/RequirementsList';
import PackageGenerator from './components/PackageGenerator';
import { ShieldCheck, Info, FileText, CheckCircle, Award } from 'lucide-react';

function DashboardContent() {
  const { state } = useAppStore();
  const t = useT();
  const { isAllValid, statuses } = useRequirementsStatus();

  // Compute stats for the summary cards
  const totalReqs = state.requirements.length;
  const mandatoryReqs = state.requirements.filter(r => r.mandatory);
  const matchedMandatoryCount = mandatoryReqs.filter(r => {
    const status = statuses[r.id];
    return status === 'ok';
  }).length;

  const totalUploaded = state.files.length;

  // Math progress percents
  const progressPercent = totalReqs > 0 
    ? Math.round((Object.keys(state.matches).length / totalReqs) * 100) 
    : 0;

  const mandatoryPercent = mandatoryReqs.length > 0
    ? Math.round((matchedMandatoryCount / mandatoryReqs.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Three-Zone Top Bar Navigation */}
      <Header />

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6">
        {/* Editorial Subheader Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-linear-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-xs relative overflow-hidden">
          {/* Subtle background abstract shapes */}
          <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10">
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300">
              {t('app_subtitle')}
            </span>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight mt-1 text-wrap balance font-sans">
              {t('app_title')}
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
              {t('app_description')}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 text-center md:text-right shrink-0 min-w-[180px]">
            <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-200 block">
              {t('matching_progress')}
            </span>
            <span className="text-3xl font-mono font-bold text-white block mt-1">
              {progressPercent}%
            </span>
            <span className="text-[11px] text-indigo-200 block mt-0.5">
              {state.language === 'en' 
                ? `${Object.keys(state.matches).length} of ${totalReqs} fulfilled` 
                : `${totalReqs} এর মধ্যে ${Object.keys(state.matches).length}টি সংযুক্ত`
              }
            </span>
          </div>
        </div>

        {/* Dashboard Panels Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main workspace section (2-columns wide) */}
          <div className="lg:col-span-2 space-y-8">
            {/* 1. Tender details */}
            <TenderDetails />

            {/* 2. Requirements checklist */}
            <RequirementsList />

            {/* 3. Uploaded files */}
            <FileList />
          </div>

          {/* Sidebar panel (1-column wide) */}
          <div className="space-y-8">
            {/* Live Submissions Progress Hub */}
            {state.tender && (
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-indigo-600" />
                  {t('health_hub')}
                </h3>

                <div className="space-y-4">
                  {/* Mandatory document tracker */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>{t('mandatory_fulfilled')}</span>
                      <span className="font-mono text-indigo-600">{matchedMandatoryCount} / {mandatoryReqs.length}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-full transition-all duration-300"
                        style={{ width: `${mandatoryPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Tiny specs guidelines */}
                  <div className="border-t border-slate-100 pt-4 mt-2">
                    <h4 className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      {t('assembly_guidelines')}
                    </h4>
                    <ul className="space-y-2 text-[11px] text-slate-500">
                      <li className="flex items-center gap-1.5">
                        <CheckCircle className={`w-3.5 h-3.5 ${totalUploaded > 0 ? 'text-emerald-500' : 'text-slate-300'}`} />
                        <span>{t('guide_upload')}</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle className={`w-3.5 h-3.5 ${Object.keys(state.matches).length > 0 ? 'text-emerald-500' : 'text-slate-300'}`} />
                        <span>{t('guide_link')}</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle className={`w-3.5 h-3.5 ${isAllValid ? 'text-emerald-500' : 'text-slate-300'}`} />
                        <span>{t('guide_expiry')}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Offline execution disclaimer */}
            <div className="bg-slate-100/50 border border-slate-200/60 rounded-xl p-4 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-slate-700">
                  {t('secure_localized_title')}
                </h4>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  {t('secure_localized_desc')}
                </p>
              </div>
            </div>

            {/* 4. Generate package (Sidebar anchor point) */}
            <PackageGenerator />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppStoreProvider>
      <DashboardContent />
    </AppStoreProvider>
  );
}
