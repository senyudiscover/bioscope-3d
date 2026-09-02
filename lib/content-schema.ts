export type BiologyNoteStatus = 'seed' | 'reviewing' | 'complete';

export interface BiologyNoteFrontmatter {
  title: string;
  anatomyId: string;
  system: string;
  status: BiologyNoteStatus;
  publish: boolean;
}

/** Only explicitly published notes with a stable anatomy ID may enter the site. */
export function isPublishableBiologyNote(value: Partial<BiologyNoteFrontmatter>) {
  return value.publish === true && typeof value.anatomyId === 'string' && value.anatomyId.trim().length > 0;
}
