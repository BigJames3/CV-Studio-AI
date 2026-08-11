import { create } from 'zustand';

export type EditorPane = 'content' | 'preview' | 'tools';
export type SaveStatus = 'saved' | 'saving' | 'pending' | 'error';

type EditorUiState = {
  activePane: EditorPane;
  activeSection: string;
  saveStatus: SaveStatus;
  dirty: boolean;
  setPane: (p: EditorPane) => void;
  setSection: (s: string) => void;
  setSaveStatus: (s: SaveStatus) => void;
  setDirty: (d: boolean) => void;
};

export const useEditorUiStore = create<EditorUiState>((set) => ({
  activePane: 'content',
  activeSection: 'experience',
  saveStatus: 'saved',
  dirty: false,
  setPane: (activePane) => set({ activePane }),
  setSection: (activeSection) => set({ activeSection }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setDirty: (dirty) => set({ dirty }),
}));
