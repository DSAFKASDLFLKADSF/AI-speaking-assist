import { isDevDatabaseEnabled } from "@/lib/devDb";
import { query, queryOne } from "@/lib/db";
import type {
  PostSurveyAnswers,
  PreSurveyAnswers,
  SurveyAnswers,
  SurveyResponseRow,
  SurveyType,
} from "@/lib/surveys/types";

interface SurveyRow {
  id: string;
  user_id: string | null;
  client_id: string | null;
  survey_type: SurveyType;
  answers: SurveyAnswers;
  created_at: Date | string;
  email?: string | null;
}

function parseAnswers(raw: unknown): SurveyAnswers {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as SurveyAnswers;
    } catch {
      return {} as SurveyAnswers;
    }
  }
  return (raw ?? {}) as SurveyAnswers;
}

function mapRow(row: SurveyRow): SurveyResponseRow {
  return {
    id: row.id,
    userId: row.user_id,
    clientId: row.client_id,
    surveyType: row.survey_type,
    answers: parseAnswers(row.answers),
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    userEmail: row.email ?? null,
  };
}

export async function getSurveyResponse(
  surveyType: SurveyType,
  actor: { userId?: string | null; clientId?: string | null }
): Promise<SurveyResponseRow | null> {
  if (actor.userId) {
    const row = await queryOne<SurveyRow>(
      `SELECT id, user_id, client_id, survey_type, answers, created_at
       FROM survey_responses
       WHERE user_id = $1 AND survey_type = $2
       LIMIT 1`,
      [actor.userId, surveyType]
    );
    return row ? mapRow(row) : null;
  }
  if (actor.clientId) {
    const row = await queryOne<SurveyRow>(
      `SELECT id, user_id, client_id, survey_type, answers, created_at
       FROM survey_responses
       WHERE client_id = $1 AND survey_type = $2 AND user_id IS NULL
       LIMIT 1`,
      [actor.clientId, surveyType]
    );
    return row ? mapRow(row) : null;
  }
  return null;
}

export async function upsertSurveyResponse(
  surveyType: SurveyType,
  answers: SurveyAnswers,
  actor: { userId?: string | null; clientId?: string | null }
): Promise<SurveyResponseRow> {
  const answersCast = isDevDatabaseEnabled() ? "$1" : "$1::jsonb";
  const payload = JSON.stringify(answers);
  const existing = await getSurveyResponse(surveyType, actor);
  if (existing) {
    const row = await queryOne<SurveyRow>(
      `UPDATE survey_responses
       SET answers = ${answersCast}, updated_at = NOW()
       WHERE id = $2
       RETURNING id, user_id, client_id, survey_type, answers, created_at`,
      [payload, existing.id]
    );
    if (!row) throw new Error("Failed to update survey.");
    return mapRow(row);
  }

  const insertCast = isDevDatabaseEnabled() ? "$4" : "$4::jsonb";
  const row = await queryOne<SurveyRow>(
    `INSERT INTO survey_responses (user_id, client_id, survey_type, answers)
     VALUES ($1, $2, $3, ${insertCast})
     RETURNING id, user_id, client_id, survey_type, answers, created_at`,
    [
      actor.userId ?? null,
      actor.clientId ?? null,
      surveyType,
      payload,
    ]
  );
  if (!row) throw new Error("Failed to save survey.");
  return mapRow(row);
}

export async function listAllSurveyResponses(): Promise<SurveyResponseRow[]> {
  const rows = await query<SurveyRow>(
    `SELECT sr.id, sr.user_id, sr.client_id, sr.survey_type, sr.answers, sr.created_at,
            u.email
     FROM survey_responses sr
     LEFT JOIN app_users u ON u.id = sr.user_id
     ORDER BY sr.created_at DESC`
  );
  return rows.map(mapRow);
}

export async function mergeAnonymousSurveysToUser(
  clientId: string,
  userId: string
): Promise<void> {
  for (const type of ["pre", "post"] as SurveyType[]) {
    const anon = await getSurveyResponse(type, { clientId });
    if (!anon) continue;
    const userRow = await getSurveyResponse(type, { userId });
    if (!userRow) {
      await query(
        `UPDATE survey_responses SET user_id = $1, updated_at = NOW() WHERE id = $2`,
        [userId, anon.id]
      );
    }
  }
}

export type { PreSurveyAnswers, PostSurveyAnswers };
