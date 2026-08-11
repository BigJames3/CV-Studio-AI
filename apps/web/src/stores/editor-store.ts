import { create } from 'zustand';
import type {
  CvContent,
  CvEducation,
  CvExperience,
  CvSkill,
  TemplateCustomization,
  TemplateKey,
} from '@/lib/templates/types';
import { TEMPLATE_DESIGN_DATA } from '@/lib/templates/catalog';
import { track } from '@/lib/analytics';

export type SectionId =
  | 'identity'
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'languages'
  | 'projects'
  | 'certificates'
  | 'references';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export type { CvContent, TemplateCustomization, TemplateKey };

export type CvLanguage = { id: string; name: string; level?: string };
export type CvProject = { id: string; name: string; description?: string; url?: string };
export type CvCertificate = { id: string; name: string; issuer?: string; year?: string };
export type CvReference = { id: string; name: string; role?: string; contact?: string };

type ListKey =
  | 'experiences'
  | 'education'
  | 'skills'
  | 'languages'
  | 'projects'
  | 'certificates'
  | 'references';

function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function markDirty(
  set: (partial: Partial<EditorState> | ((s: EditorState) => Partial<EditorState>)) => void,
  content: CvContent
) {
  set({ content, dirty: true, saveStatus: 'idle' });
}

function moveInList<T extends { id: string }>(
  items: T[],
  id: string,
  direction: 'up' | 'down'
): T[] | null {
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return null;
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= items.length) return null;
  const next = [...items];
  const [removed] = next.splice(index, 1);
  next.splice(target, 0, removed);
  return next;
}

type EditorState = {
  resumeId: string | null;
  templateKey: TemplateKey;
  content: CvContent;
  dirty: boolean;
  saveStatus: SaveStatus;
  activeSection: SectionId;
  previewZoom: number;
  drawer: null | 'ats' | 'ai' | 'match' | 'template';
  mobileTab: 'content' | 'preview' | 'tools';
  hydrate: (resumeId: string, content: CvContent, templateKey?: TemplateKey) => void;
  setTemplateKey: (k: TemplateKey) => void;
  patchCustomization: (patch: Partial<TemplateCustomization>) => void;
  setActiveSection: (s: SectionId) => void;
  patchIdentity: (patch: Partial<CvContent['identity']>) => void;
  setSummary: (text: string) => void;
  // Experience
  addExperience: () => void;
  updateExperience: (id: string, patch: Partial<CvExperience>) => void;
  removeExperience: (id: string) => void;
  // Education
  addEducation: () => void;
  updateEducation: (id: string, patch: Partial<CvEducation>) => void;
  removeEducation: (id: string) => void;
  // Skills
  addSkill: () => void;
  updateSkill: (id: string, patch: Partial<CvSkill>) => void;
  removeSkill: (id: string) => void;
  // Languages
  addLanguage: () => void;
  updateLanguage: (id: string, patch: Partial<CvLanguage>) => void;
  removeLanguage: (id: string) => void;
  // Projects
  addProject: () => void;
  updateProject: (id: string, patch: Partial<CvProject>) => void;
  removeProject: (id: string) => void;
  // Certificates
  addCertificate: () => void;
  updateCertificate: (id: string, patch: Partial<CvCertificate>) => void;
  removeCertificate: (id: string) => void;
  // References
  addReference: () => void;
  updateReference: (id: string, patch: Partial<CvReference>) => void;
  removeReference: (id: string) => void;
  moveItem: (list: ListKey, id: string, direction: 'up' | 'down') => void;
  setSaveStatus: (s: SaveStatus) => void;
  setDrawer: (d: EditorState['drawer']) => void;
  setMobileTab: (t: EditorState['mobileTab']) => void;
  setZoom: (z: number) => void;
  markClean: () => void;
};

export const emptyContent = (templateKey: TemplateKey = 'modern'): CvContent => ({
  schemaVersion: 1,
  templateKey,
  customization: { ...TEMPLATE_DESIGN_DATA[templateKey].defaults },
  identity: { fullName: '' },
  summary: { text: '' },
  experiences: [],
  education: [],
  skills: [],
  languages: [],
  projects: [],
  certificates: [],
  references: [],
});

export const useEditorStore = create<EditorState>((set, get) => ({
  resumeId: null,
  templateKey: 'modern',
  content: emptyContent(),
  dirty: false,
  saveStatus: 'idle',
  activeSection: 'identity',
  previewZoom: 100,
  drawer: null,
  mobileTab: 'content',
  hydrate: (resumeId, content, templateKey) =>
    set({
      resumeId,
      content: {
        ...emptyContent(templateKey ?? content.templateKey ?? 'modern'),
        ...content,
        references: content.references ?? [],
      },
      templateKey: templateKey ?? content.templateKey ?? 'modern',
      dirty: false,
      saveStatus: 'saved',
    }),
  setTemplateKey: (templateKey) =>
    set((s) => ({
      templateKey,
      dirty: true,
      saveStatus: 'idle',
      content: {
        ...s.content,
        templateKey,
        customization: {
          ...TEMPLATE_DESIGN_DATA[templateKey].defaults,
          ...s.content.customization,
        },
      },
    })),
  patchCustomization: (patch) =>
    set((s) => ({
      dirty: true,
      saveStatus: 'idle',
      content: {
        ...s.content,
        customization: {
          ...(s.content.customization ?? TEMPLATE_DESIGN_DATA[s.templateKey].defaults),
          ...patch,
        },
      },
    })),
  setActiveSection: (activeSection) => set({ activeSection }),
  patchIdentity: (patch) =>
    set((s) => ({
      dirty: true,
      saveStatus: 'idle',
      content: { ...s.content, identity: { ...s.content.identity, ...patch } },
    })),
  setSummary: (text) =>
    set((s) => ({
      dirty: true,
      saveStatus: 'idle',
      content: { ...s.content, summary: { text } },
    })),

  addExperience: () => {
    const item: CvExperience = {
      id: newId('exp'),
      company: '',
      title: '',
      location: '',
      start: '',
      end: null,
      current: false,
      bullets: [''],
    };
    markDirty(set, { ...get().content, experiences: [...get().content.experiences, item] });
  },
  updateExperience: (id, patch) => {
    markDirty(set, {
      ...get().content,
      experiences: get().content.experiences.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    });
  },
  removeExperience: (id) => {
    markDirty(set, {
      ...get().content,
      experiences: get().content.experiences.filter((e) => e.id !== id),
    });
  },

  addEducation: () => {
    const item: CvEducation = {
      id: newId('edu'),
      school: '',
      degree: '',
      field: '',
      start: '',
      end: '',
      details: '',
    };
    markDirty(set, { ...get().content, education: [...get().content.education, item] });
  },
  updateEducation: (id, patch) => {
    markDirty(set, {
      ...get().content,
      education: get().content.education.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    });
  },
  removeEducation: (id) => {
    markDirty(set, {
      ...get().content,
      education: get().content.education.filter((e) => e.id !== id),
    });
  },

  addSkill: () => {
    const item: CvSkill = { id: newId('sk'), name: '', level: 3 };
    markDirty(set, { ...get().content, skills: [...get().content.skills, item] });
  },
  updateSkill: (id, patch) => {
    markDirty(set, {
      ...get().content,
      skills: get().content.skills.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    });
  },
  removeSkill: (id) => {
    markDirty(set, {
      ...get().content,
      skills: get().content.skills.filter((e) => e.id !== id),
    });
  },

  addLanguage: () => {
    const item: CvLanguage = { id: newId('lang'), name: '', level: '' };
    markDirty(set, { ...get().content, languages: [...get().content.languages, item] });
  },
  updateLanguage: (id, patch) => {
    markDirty(set, {
      ...get().content,
      languages: get().content.languages.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    });
  },
  removeLanguage: (id) => {
    markDirty(set, {
      ...get().content,
      languages: get().content.languages.filter((e) => e.id !== id),
    });
  },

  addProject: () => {
    const item: CvProject = { id: newId('proj'), name: '', description: '', url: '' };
    markDirty(set, { ...get().content, projects: [...get().content.projects, item] });
  },
  updateProject: (id, patch) => {
    markDirty(set, {
      ...get().content,
      projects: get().content.projects.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    });
  },
  removeProject: (id) => {
    markDirty(set, {
      ...get().content,
      projects: get().content.projects.filter((e) => e.id !== id),
    });
  },

  addCertificate: () => {
    const item: CvCertificate = { id: newId('cert'), name: '', issuer: '', year: '' };
    markDirty(set, { ...get().content, certificates: [...get().content.certificates, item] });
  },
  updateCertificate: (id, patch) => {
    markDirty(set, {
      ...get().content,
      certificates: get().content.certificates.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    });
  },
  removeCertificate: (id) => {
    markDirty(set, {
      ...get().content,
      certificates: get().content.certificates.filter((e) => e.id !== id),
    });
  },

  addReference: () => {
    const item: CvReference = { id: newId('ref'), name: '', role: '', contact: '' };
    markDirty(set, {
      ...get().content,
      references: [...(get().content.references ?? []), item],
    });
  },
  updateReference: (id, patch) => {
    markDirty(set, {
      ...get().content,
      references: (get().content.references ?? []).map((e) =>
        e.id === id ? { ...e, ...patch } : e
      ),
    });
  },
  removeReference: (id) => {
    markDirty(set, {
      ...get().content,
      references: (get().content.references ?? []).filter((e) => e.id !== id),
    });
  },

  moveItem: (list, id, direction) => {
    const content = get().content;
    const current = (list === 'references' ? (content.references ?? []) : content[list]) as Array<{
      id: string;
    }>;
    const next = moveInList(current, id, direction);
    if (!next) return;
    markDirty(set, {
      ...content,
      [list]: next,
    });
    track('cv_reordered', { section: list, direction });
  },

  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setDrawer: (drawer) => set({ drawer }),
  setMobileTab: (mobileTab) => set({ mobileTab }),
  setZoom: (previewZoom) => set({ previewZoom }),
  markClean: () => set({ dirty: false, saveStatus: 'saved' }),
}));
