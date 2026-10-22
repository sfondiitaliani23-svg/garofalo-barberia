'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin, requireAdminView } from '@/lib/auth';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  SITE_AREAS,
  type IssueReport,
  type SiteAreaInfo,
  type AIAgentLog,
} from '@/lib/data/site-areas';

// Fallback in-memory storage se la tabella DB non è ancora migrata
let memoryReportsStore: IssueReport[] = [];

export interface CreateIssueInput {
  areaId: string;
  title: string;
  description: string;
  priority: 'bassa' | 'media' | 'alta' | 'critica';
  technicalDetails?: string;
}

async function issuesDb() {
  return (await createServiceClient()) ?? (await createClient());
}

export async function getIssueReports(): Promise<IssueReport[]> {
  await requireAdminView();

  const supabase = await issuesDb();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('site_issues')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((item) => ({
          id: item.id,
          areaId: item.area_id,
          areaName: item.area_name,
          title: item.title,
          description: item.description,
          priority: item.priority,
          status: item.status,
          technicalDetails: item.technical_details,
          reportedBy: item.reported_by || 'Luigi Garofalo (Titolare)',
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          aiLogs: item.ai_logs || [],
          aiResolutionSummary: item.ai_resolution_summary,
          developerNotes: item.developer_notes,
          aiProposal: item.ai_proposal ?? null,
          assignedAgents: item.assigned_agents || [
            SITE_AREAS.find((a) => a.id === item.area_id)?.agent1 || SITE_AREAS[0].agent1,
            SITE_AREAS.find((a) => a.id === item.area_id)?.agent2 || SITE_AREAS[0].agent2,
          ],
        }));
      }
    } catch {
      // Se la tabella DB non esiste ancora, fallback silenzioso allo store in memoria
    }
  }

  return memoryReportsStore;
}

export async function createIssueReport(input: CreateIssueInput): Promise<{
  ok: boolean;
  report?: IssueReport;
  error?: string;
}> {
  await requireAdmin();

  if (!input.title || !input.description || !input.areaId) {
    return { ok: false, error: 'Compilare tutti i campi obbligatori del modulo di segnalazione.' };
  }

  const areaInfo = SITE_AREAS.find((a) => a.id === input.areaId) || SITE_AREAS[0];
  // Nessuna risoluzione automatica: la segnalazione resta aperta finché qualcuno non la gestisce.
  const status: IssueReport['status'] = 'in_analisi';
  const logs: IssueReport['aiLogs'] = [];
  const summary: string | undefined = undefined;

  const reportId = `REP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const nowStr = new Date().toISOString();

  const newReport: IssueReport = {
    id: reportId,
    areaId: areaInfo.id,
    areaName: areaInfo.name,
    title: input.title.trim(),
    description: input.description.trim(),
    priority: input.priority || 'media',
    status,
    technicalDetails: input.technicalDetails?.trim() || undefined,
    reportedBy: 'Luigi Garofalo (Titolare)',
    createdAt: nowStr,
    updatedAt: nowStr,
    aiLogs: logs,
    aiResolutionSummary: summary,
    assignedAgents: [areaInfo.agent1, areaInfo.agent2],
  };

  // Salva in memoria
  memoryReportsStore = [newReport, ...memoryReportsStore];

  // Tentativo di persistenza Supabase se la tabella esiste
  const supabase = await issuesDb();
  if (supabase) {
    try {
      await supabase.from('site_issues').insert({
        id: newReport.id,
        area_id: newReport.areaId,
        area_name: newReport.areaName,
        title: newReport.title,
        description: newReport.description,
        priority: newReport.priority,
        status: newReport.status,
        technical_details: newReport.technicalDetails,
        reported_by: newReport.reportedBy,
        created_at: newReport.createdAt,
        updated_at: newReport.updatedAt,
        ai_logs: newReport.aiLogs,
        ai_resolution_summary: newReport.aiResolutionSummary,
        assigned_agents: newReport.assignedAgents,
      });
    } catch {
      // ignora errore se tabella non creata
    }
  }

  revalidatePath('/admin/segnalazioni');
  return { ok: true, report: newReport };
}

export async function updateReportStatus(
  reportId: string,
  newStatus: IssueReport['status'],
  developerNotes?: string
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  const index = memoryReportsStore.findIndex((r) => r.id === reportId);
  if (index !== -1) {
    memoryReportsStore[index] = {
      ...memoryReportsStore[index],
      status: newStatus,
      developerNotes: developerNotes !== undefined ? developerNotes : memoryReportsStore[index].developerNotes,
      updatedAt: new Date().toISOString(),
    };
  }

  const supabase = await issuesDb();
  if (supabase) {
    try {
      await supabase
        .from('site_issues')
        .update({
          status: newStatus,
          developer_notes: developerNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId);
    } catch {
      // ignore
    }
  }

  revalidatePath('/admin/segnalazioni');
  return { ok: true };
}

export async function deleteIssueReport(reportId: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  memoryReportsStore = memoryReportsStore.filter((r) => r.id !== reportId);

  const supabase = await issuesDb();
  if (supabase) {
    try {
      await supabase.from('site_issues').delete().eq('id', reportId);
    } catch {
      // ignore
    }
  }

  revalidatePath('/admin/segnalazioni');
  return { ok: true };
}
