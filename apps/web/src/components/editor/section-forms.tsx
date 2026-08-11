'use client';

import { useMemo } from 'react';
import { useEditorStore } from '@/stores/editor-store';
import { Label } from '@/components/ui/input';
import { identitySchema } from '@/lib/validations/auth';
import { AddItemButton, FormField, FormTextarea, SectionCard } from './form-primitives';

function useIdentityErrors() {
  const identity = useEditorStore((s) => s.content.identity);
  return useMemo(() => {
    const result = identitySchema.safeParse({
      fullName: identity.fullName,
      headline: identity.headline,
      email: identity.email ?? '',
      phone: identity.phone,
      city: identity.city,
    });
    if (result.success) return {} as Record<string, string>;
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? '');
      if (key && !errors[key]) errors[key] = issue.message;
    }
    return errors;
  }, [identity]);
}

export function IdentityForm() {
  const identity = useEditorStore((s) => s.content.identity);
  const patchIdentity = useEditorStore((s) => s.patchIdentity);
  const errors = useIdentityErrors();

  return (
    <div className="space-y-4" data-testid="identity-form">
      <FormField
        id="fullName"
        label="Nom complet"
        required
        value={identity.fullName}
        onChange={(fullName) => patchIdentity({ fullName })}
        error={identity.fullName.trim() ? undefined : errors.fullName}
      />
      <FormField
        id="headline"
        label="Titre / Headline"
        value={identity.headline ?? ''}
        onChange={(headline) => patchIdentity({ headline })}
        placeholder="ex. Senior Product Designer"
      />
      <FormField
        id="email"
        label="Email"
        type="email"
        value={identity.email ?? ''}
        onChange={(email) => patchIdentity({ email })}
        error={identity.email ? errors.email : undefined}
      />
      <FormField
        id="phone"
        label="Téléphone"
        value={identity.phone ?? ''}
        onChange={(phone) => patchIdentity({ phone })}
      />
      <FormField
        id="city"
        label="Localisation"
        value={identity.city ?? ''}
        onChange={(city) => patchIdentity({ city })}
        placeholder="Paris, FR"
      />
      <FormField
        id="linkedin"
        label="LinkedIn"
        value={identity.linkedin ?? ''}
        onChange={(linkedin) => patchIdentity({ linkedin })}
        placeholder="linkedin.com/in/…"
      />
      <FormField
        id="github"
        label="GitHub"
        value={identity.github ?? ''}
        onChange={(github) => patchIdentity({ github })}
        placeholder="github.com/…"
      />
      <FormField
        id="website"
        label="Site web"
        value={identity.website ?? ''}
        onChange={(website) => patchIdentity({ website })}
        placeholder="https://…"
      />
      <FormField
        id="photo"
        label="Photo (URL)"
        value={identity.photoUrl ?? ''}
        onChange={(photoUrl) => patchIdentity({ photoUrl: photoUrl || null })}
        placeholder="https://…"
      />
    </div>
  );
}

export function SummaryForm() {
  const text = useEditorStore((s) => s.content.summary.text);
  const setSummary = useEditorStore((s) => s.setSummary);

  return (
    <div data-testid="summary-form">
      <FormTextarea
        id="summary"
        label="Résumé professionnel"
        value={text}
        onChange={setSummary}
        placeholder="Paragraphe d’accroche pour le recruteur…"
        rows={8}
      />
    </div>
  );
}

export function ExperienceForm() {
  const items = useEditorStore((s) => s.content.experiences);
  const addExperience = useEditorStore((s) => s.addExperience);
  const updateExperience = useEditorStore((s) => s.updateExperience);
  const removeExperience = useEditorStore((s) => s.removeExperience);
  const moveItem = useEditorStore((s) => s.moveItem);

  return (
    <div className="space-y-4" data-testid="experience-form">
      {items.map((exp, index) => (
        <SectionCard
          key={exp.id}
          title={exp.title || exp.company || `Expérience ${index + 1}`}
          onRemove={() => removeExperience(exp.id)}
          onMoveUp={() => moveItem('experiences', exp.id, 'up')}
          onMoveDown={() => moveItem('experiences', exp.id, 'down')}
          canMoveUp={index > 0}
          canMoveDown={index < items.length - 1}
        >
          <FormField
            id={`${exp.id}-title`}
            label="Poste"
            required
            value={exp.title}
            onChange={(title) => updateExperience(exp.id, { title })}
          />
          <FormField
            id={`${exp.id}-company`}
            label="Entreprise"
            required
            value={exp.company}
            onChange={(company) => updateExperience(exp.id, { company })}
          />
          <FormField
            id={`${exp.id}-location`}
            label="Lieu"
            value={exp.location ?? ''}
            onChange={(location) => updateExperience(exp.id, { location })}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              id={`${exp.id}-start`}
              label="Début"
              required
              value={exp.start}
              onChange={(start) => updateExperience(exp.id, { start })}
              placeholder="2022"
            />
            <FormField
              id={`${exp.id}-end`}
              label="Fin"
              value={exp.current ? '' : (exp.end ?? '')}
              onChange={(end) => updateExperience(exp.id, { end: end || null, current: false })}
              placeholder="2024"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(exp.current)}
              onChange={(e) =>
                updateExperience(exp.id, {
                  current: e.target.checked,
                  end: e.target.checked ? null : exp.end,
                })
              }
            />
            Poste actuel
          </label>
          <div>
            <Label htmlFor={`${exp.id}-bullets`}>Description (une puce par ligne)</Label>
            <textarea
              id={`${exp.id}-bullets`}
              className="min-h-28 w-full rounded-md border border-border bg-surface-card px-3 py-2 text-sm"
              value={exp.bullets.join('\n')}
              placeholder="Réalisations, impact, technologies…"
              onChange={(e) =>
                updateExperience(exp.id, {
                  bullets: e.target.value.split('\n'),
                })
              }
            />
          </div>
        </SectionCard>
      ))}
      <AddItemButton label="+ Ajouter une expérience" onClick={addExperience} />
    </div>
  );
}

export function EducationForm() {
  const items = useEditorStore((s) => s.content.education);
  const addEducation = useEditorStore((s) => s.addEducation);
  const updateEducation = useEditorStore((s) => s.updateEducation);
  const removeEducation = useEditorStore((s) => s.removeEducation);
  const moveItem = useEditorStore((s) => s.moveItem);

  return (
    <div className="space-y-4" data-testid="education-form">
      {items.map((edu, index) => (
        <SectionCard
          key={edu.id}
          title={edu.school || edu.degree || `Formation ${index + 1}`}
          onRemove={() => removeEducation(edu.id)}
          onMoveUp={() => moveItem('education', edu.id, 'up')}
          onMoveDown={() => moveItem('education', edu.id, 'down')}
          canMoveUp={index > 0}
          canMoveDown={index < items.length - 1}
        >
          <FormField
            id={`${edu.id}-school`}
            label="École / Université"
            value={edu.school}
            onChange={(school) => updateEducation(edu.id, { school })}
          />
          <FormField
            id={`${edu.id}-degree`}
            label="Diplôme"
            value={edu.degree}
            onChange={(degree) => updateEducation(edu.id, { degree })}
          />
          <FormField
            id={`${edu.id}-field`}
            label="Domaine / Major"
            value={edu.field ?? ''}
            onChange={(field) => updateEducation(edu.id, { field })}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              id={`${edu.id}-start`}
              label="Début"
              value={edu.start ?? ''}
              onChange={(start) => updateEducation(edu.id, { start })}
            />
            <FormField
              id={`${edu.id}-end`}
              label="Fin"
              value={edu.end ?? ''}
              onChange={(end) => updateEducation(edu.id, { end })}
            />
          </div>
          <FormTextarea
            id={`${edu.id}-details`}
            label="Détails"
            value={edu.details ?? ''}
            onChange={(details) => updateEducation(edu.id, { details })}
            rows={3}
          />
        </SectionCard>
      ))}
      <AddItemButton label="+ Ajouter une formation" onClick={addEducation} />
    </div>
  );
}

export function SkillsForm() {
  const items = useEditorStore((s) => s.content.skills);
  const addSkill = useEditorStore((s) => s.addSkill);
  const updateSkill = useEditorStore((s) => s.updateSkill);
  const removeSkill = useEditorStore((s) => s.removeSkill);
  const moveItem = useEditorStore((s) => s.moveItem);

  return (
    <div className="space-y-4" data-testid="skills-form">
      {items.map((skill, index) => (
        <SectionCard
          key={skill.id}
          title={skill.name || `Compétence ${index + 1}`}
          onRemove={() => removeSkill(skill.id)}
          onMoveUp={() => moveItem('skills', skill.id, 'up')}
          onMoveDown={() => moveItem('skills', skill.id, 'down')}
          canMoveUp={index > 0}
          canMoveDown={index < items.length - 1}
        >
          <FormField
            id={`${skill.id}-name`}
            label="Compétence"
            value={skill.name}
            onChange={(name) => updateSkill(skill.id, { name })}
          />
          <div>
            <Label htmlFor={`${skill.id}-level`}>Niveau (1–5)</Label>
            <select
              id={`${skill.id}-level`}
              className="h-10 w-full rounded-md border border-border bg-surface-card px-3 text-sm"
              value={skill.level ?? 3}
              onChange={(e) => updateSkill(skill.id, { level: Number(e.target.value) })}
            >
              <option value={1}>1 — Débutant</option>
              <option value={2}>2 — Intermédiaire bas</option>
              <option value={3}>3 — Intermédiaire</option>
              <option value={4}>4 — Avancé</option>
              <option value={5}>5 — Expert</option>
            </select>
          </div>
        </SectionCard>
      ))}
      <AddItemButton label="+ Ajouter une compétence" onClick={addSkill} />
    </div>
  );
}

export function LanguagesForm() {
  const items = useEditorStore((s) => s.content.languages);
  const addLanguage = useEditorStore((s) => s.addLanguage);
  const updateLanguage = useEditorStore((s) => s.updateLanguage);
  const removeLanguage = useEditorStore((s) => s.removeLanguage);
  const moveItem = useEditorStore((s) => s.moveItem);

  return (
    <div className="space-y-4" data-testid="languages-form">
      {items.map((lang, index) => (
        <SectionCard
          key={lang.id}
          title={lang.name || `Langue ${index + 1}`}
          onRemove={() => removeLanguage(lang.id)}
          onMoveUp={() => moveItem('languages', lang.id, 'up')}
          onMoveDown={() => moveItem('languages', lang.id, 'down')}
          canMoveUp={index > 0}
          canMoveDown={index < items.length - 1}
        >
          <FormField
            id={`${lang.id}-name`}
            label="Langue"
            value={lang.name}
            onChange={(name) => updateLanguage(lang.id, { name })}
          />
          <FormField
            id={`${lang.id}-level`}
            label="Niveau"
            value={lang.level ?? ''}
            onChange={(level) => updateLanguage(lang.id, { level })}
            placeholder="Natif, Fluent, B2…"
          />
        </SectionCard>
      ))}
      <AddItemButton label="+ Ajouter une langue" onClick={addLanguage} />
    </div>
  );
}

export function ProjectsForm() {
  const items = useEditorStore((s) => s.content.projects);
  const addProject = useEditorStore((s) => s.addProject);
  const updateProject = useEditorStore((s) => s.updateProject);
  const removeProject = useEditorStore((s) => s.removeProject);
  const moveItem = useEditorStore((s) => s.moveItem);

  return (
    <div className="space-y-4" data-testid="projects-form">
      {items.map((project, index) => (
        <SectionCard
          key={project.id}
          title={project.name || `Projet ${index + 1}`}
          onRemove={() => removeProject(project.id)}
          onMoveUp={() => moveItem('projects', project.id, 'up')}
          onMoveDown={() => moveItem('projects', project.id, 'down')}
          canMoveUp={index > 0}
          canMoveDown={index < items.length - 1}
        >
          <FormField
            id={`${project.id}-name`}
            label="Titre"
            value={project.name}
            onChange={(name) => updateProject(project.id, { name })}
          />
          <FormTextarea
            id={`${project.id}-desc`}
            label="Description"
            value={project.description ?? ''}
            onChange={(description) => updateProject(project.id, { description })}
            rows={3}
          />
          <FormField
            id={`${project.id}-url`}
            label="URL"
            value={project.url ?? ''}
            onChange={(url) => updateProject(project.id, { url })}
            placeholder="https://…"
          />
        </SectionCard>
      ))}
      <AddItemButton label="+ Ajouter un projet" onClick={addProject} />
    </div>
  );
}

export function CertificatesForm() {
  const items = useEditorStore((s) => s.content.certificates);
  const addCertificate = useEditorStore((s) => s.addCertificate);
  const updateCertificate = useEditorStore((s) => s.updateCertificate);
  const removeCertificate = useEditorStore((s) => s.removeCertificate);
  const moveItem = useEditorStore((s) => s.moveItem);

  return (
    <div className="space-y-4" data-testid="certificates-form">
      {items.map((cert, index) => (
        <SectionCard
          key={cert.id}
          title={cert.name || `Certificat ${index + 1}`}
          onRemove={() => removeCertificate(cert.id)}
          onMoveUp={() => moveItem('certificates', cert.id, 'up')}
          onMoveDown={() => moveItem('certificates', cert.id, 'down')}
          canMoveUp={index > 0}
          canMoveDown={index < items.length - 1}
        >
          <FormField
            id={`${cert.id}-name`}
            label="Nom"
            value={cert.name}
            onChange={(name) => updateCertificate(cert.id, { name })}
          />
          <FormField
            id={`${cert.id}-issuer`}
            label="Organisme"
            value={cert.issuer ?? ''}
            onChange={(issuer) => updateCertificate(cert.id, { issuer })}
          />
          <FormField
            id={`${cert.id}-year`}
            label="Année"
            value={cert.year ?? ''}
            onChange={(year) => updateCertificate(cert.id, { year })}
            placeholder="2023"
          />
        </SectionCard>
      ))}
      <AddItemButton label="+ Ajouter un certificat" onClick={addCertificate} />
    </div>
  );
}

export function ReferencesForm() {
  const items = useEditorStore((s) => s.content.references ?? []);
  const addReference = useEditorStore((s) => s.addReference);
  const updateReference = useEditorStore((s) => s.updateReference);
  const removeReference = useEditorStore((s) => s.removeReference);
  const moveItem = useEditorStore((s) => s.moveItem);
  const showReferences = useEditorStore((s) => s.content.customization?.showReferences ?? false);
  const patchCustomization = useEditorStore((s) => s.patchCustomization);

  return (
    <div className="space-y-4" data-testid="references-form">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={showReferences}
          onChange={(e) => patchCustomization({ showReferences: e.target.checked })}
        />
        Afficher les références sur le CV
      </label>
      {items.map((ref, index) => (
        <SectionCard
          key={ref.id}
          title={ref.name || `Référence ${index + 1}`}
          onRemove={() => removeReference(ref.id)}
          onMoveUp={() => moveItem('references', ref.id, 'up')}
          onMoveDown={() => moveItem('references', ref.id, 'down')}
          canMoveUp={index > 0}
          canMoveDown={index < items.length - 1}
        >
          <FormField
            id={`${ref.id}-name`}
            label="Nom"
            value={ref.name}
            onChange={(name) => updateReference(ref.id, { name })}
          />
          <FormField
            id={`${ref.id}-role`}
            label="Fonction / Relation"
            value={ref.role ?? ''}
            onChange={(role) => updateReference(ref.id, { role })}
            placeholder="ex. Manager chez Acme"
          />
          <FormField
            id={`${ref.id}-contact`}
            label="Contact"
            value={ref.contact ?? ''}
            onChange={(contact) => updateReference(ref.id, { contact })}
            placeholder="email ou téléphone"
          />
        </SectionCard>
      ))}
      <AddItemButton label="+ Ajouter une référence" onClick={addReference} />
    </div>
  );
}
