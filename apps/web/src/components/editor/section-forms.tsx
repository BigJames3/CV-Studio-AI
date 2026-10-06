'use client';

import { useMemo } from 'react';
import { useEditorStore } from '@/stores/editor-store';
import { Label } from '@/components/ui/input';
import { identitySchema } from '@/lib/validations/auth';
import {
  CONTRACT_TYPES,
  DATE_PLACEHOLDER,
  LANGUAGE_LEVELS,
  SKILL_CATEGORIES,
} from '@/lib/templates/cv-options';
import {
  AddItemButton,
  CheckboxField,
  FormField,
  FormTextarea,
  SectionCard,
  Suggestions,
} from './form-primitives';

const DATE_HINT = 'Le mois est facultatif : n’indiquez que ce que vous savez.';

/** Textarea lines as a list; empty lines are kept while typing and dropped on the CV. */
function splitLines(value: string) {
  return value.split('\n');
}

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
        label="Titre professionnel"
        value={identity.headline ?? ''}
        onChange={(headline) => patchIdentity({ headline })}
        placeholder="ex. Responsable commercial"
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
      <div className="grid grid-cols-2 gap-3">
        <FormField
          id="city"
          label="Ville"
          value={identity.city ?? ''}
          onChange={(city) => patchIdentity({ city })}
          placeholder="Abidjan"
        />
        <FormField
          id="country"
          label="Pays"
          value={identity.country ?? ''}
          onChange={(country) => patchIdentity({ country })}
          placeholder="Côte d’Ivoire"
        />
      </div>
      <FormField
        id="address"
        label="Adresse (facultative)"
        value={identity.address ?? ''}
        onChange={(address) => patchIdentity({ address })}
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
        label="Site web / portfolio"
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
          <div className="grid grid-cols-2 gap-3">
            <FormField
              id={`${exp.id}-location`}
              label="Ville / pays"
              value={exp.location ?? ''}
              onChange={(location) => updateExperience(exp.id, { location })}
            />
            <FormField
              id={`${exp.id}-contract`}
              label="Type de contrat"
              list="cv-contract-types"
              value={exp.contractType ?? ''}
              onChange={(contractType) => updateExperience(exp.id, { contractType })}
              placeholder="CDI, Stage…"
            />
          </div>
          <FormField
            id={`${exp.id}-sector`}
            label="Secteur d’activité (facultatif)"
            value={exp.sector ?? ''}
            onChange={(sector) => updateExperience(exp.id, { sector })}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              id={`${exp.id}-start`}
              label="Début"
              required
              value={exp.start}
              onChange={(start) => updateExperience(exp.id, { start })}
              placeholder={DATE_PLACEHOLDER}
            />
            <FormField
              id={`${exp.id}-end`}
              label="Fin"
              value={exp.current ? '' : (exp.end ?? '')}
              onChange={(end) => updateExperience(exp.id, { end: end || null, current: false })}
              placeholder={DATE_PLACEHOLDER}
            />
          </div>
          <p className="-mt-1 text-xs text-content-secondary">{DATE_HINT}</p>
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
            <Label htmlFor={`${exp.id}-bullets`}>Responsabilités (une par ligne)</Label>
            <textarea
              id={`${exp.id}-bullets`}
              className="min-h-28 w-full rounded-md border border-border bg-surface-card px-3 py-2 text-sm"
              value={exp.bullets.join('\n')}
              placeholder="Missions principales du poste…"
              onChange={(e) => updateExperience(exp.id, { bullets: splitLines(e.target.value) })}
            />
          </div>
          <FormTextarea
            id={`${exp.id}-achievements`}
            label="Réalisations (une par ligne)"
            value={(exp.achievements ?? []).join('\n')}
            onChange={(v) => updateExperience(exp.id, { achievements: splitLines(v) })}
            placeholder="Résultats obtenus. N’indiquez un chiffre que s’il est réel."
            rows={3}
          />
          <FormField
            id={`${exp.id}-tools`}
            label="Outils / compétences utilisés"
            value={exp.tools ?? ''}
            onChange={(tools) => updateExperience(exp.id, { tools })}
            placeholder="séparés par des virgules"
          />
        </SectionCard>
      ))}
      <AddItemButton label="+ Ajouter une expérience" onClick={addExperience} />
      <Suggestions id="cv-contract-types" values={CONTRACT_TYPES} />
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
            label="Spécialité"
            value={edu.field ?? ''}
            onChange={(field) => updateEducation(edu.id, { field })}
          />
          <FormField
            id={`${edu.id}-location`}
            label="Ville / pays"
            value={edu.location ?? ''}
            onChange={(location) => updateEducation(edu.id, { location })}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              id={`${edu.id}-start`}
              label="Début"
              value={edu.start ?? ''}
              onChange={(start) => updateEducation(edu.id, { start })}
              placeholder={DATE_PLACEHOLDER}
            />
            <FormField
              id={`${edu.id}-end`}
              label="Fin"
              value={edu.end ?? ''}
              onChange={(end) => updateEducation(edu.id, { end })}
              placeholder={DATE_PLACEHOLDER}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField
              id={`${edu.id}-honors`}
              label="Mention (facultative)"
              value={edu.honors ?? ''}
              onChange={(honors) => updateEducation(edu.id, { honors })}
            />
            <FormField
              id={`${edu.id}-thesis`}
              label="Projet / mémoire"
              value={edu.thesis ?? ''}
              onChange={(thesis) => updateEducation(edu.id, { thesis })}
            />
          </div>
          <FormTextarea
            id={`${edu.id}-details`}
            label="Description (facultative)"
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
          <FormField
            id={`${skill.id}-category`}
            label="Catégorie (facultative)"
            list="cv-skill-categories"
            value={skill.category ?? ''}
            onChange={(category) => updateSkill(skill.id, { category })}
            placeholder="Compétences techniques…"
          />
          <div>
            <Label htmlFor={`${skill.id}-level`}>Niveau (facultatif)</Label>
            <select
              id={`${skill.id}-level`}
              className="h-10 w-full rounded-md border border-border bg-surface-card px-3 text-sm"
              value={skill.level ?? 0}
              onChange={(e) =>
                updateSkill(skill.id, { level: Number(e.target.value) || undefined })
              }
            >
              <option value={0}>Non précisé</option>
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
      <Suggestions id="cv-skill-categories" values={SKILL_CATEGORIES} />
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
            list="cv-language-levels"
            value={lang.level ?? ''}
            onChange={(level) => updateLanguage(lang.id, { level })}
            placeholder="Langue maternelle, B2…"
            hint="Niveaux CECRL : A1, A2, B1, B2, C1, C2."
          />
          <FormField
            id={`${lang.id}-certification`}
            label="Certification (facultative)"
            value={lang.certification ?? ''}
            onChange={(certification) => updateLanguage(lang.id, { certification })}
            placeholder="TOEIC 850, DELF B2…"
          />
        </SectionCard>
      ))}
      <AddItemButton label="+ Ajouter une langue" onClick={addLanguage} />
      <Suggestions id="cv-language-levels" values={LANGUAGE_LEVELS} />
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
            label="Nom du projet"
            value={project.name}
            onChange={(name) => updateProject(project.id, { name })}
          />
          <FormField
            id={`${project.id}-role`}
            label="Rôle"
            value={project.role ?? ''}
            onChange={(role) => updateProject(project.id, { role })}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              id={`${project.id}-start`}
              label="Début"
              value={project.start ?? ''}
              onChange={(start) => updateProject(project.id, { start })}
              placeholder={DATE_PLACEHOLDER}
            />
            <FormField
              id={`${project.id}-end`}
              label="Fin"
              value={project.current ? '' : (project.end ?? '')}
              onChange={(end) => updateProject(project.id, { end, current: false })}
              placeholder={DATE_PLACEHOLDER}
            />
          </div>
          <CheckboxField
            label="Projet en cours"
            checked={Boolean(project.current)}
            onChange={(current) =>
              updateProject(project.id, { current, end: current ? '' : project.end })
            }
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
            label="Lien (site, GitHub…)"
            value={project.url ?? ''}
            onChange={(url) => updateProject(project.id, { url })}
            placeholder="https://…"
          />
          <FormField
            id={`${project.id}-technologies`}
            label="Technologies / outils"
            value={project.technologies ?? ''}
            onChange={(technologies) => updateProject(project.id, { technologies })}
            placeholder="séparés par des virgules"
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
          <div className="grid grid-cols-2 gap-3">
            <FormField
              id={`${cert.id}-year`}
              label="Date d’obtention"
              value={cert.year ?? ''}
              onChange={(year) => updateCertificate(cert.id, { year })}
              placeholder={DATE_PLACEHOLDER}
            />
            <FormField
              id={`${cert.id}-expires`}
              label="Expiration (si applicable)"
              value={cert.expires ?? ''}
              onChange={(expires) => updateCertificate(cert.id, { expires })}
              placeholder={DATE_PLACEHOLDER}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField
              id={`${cert.id}-credential`}
              label="Identifiant (facultatif)"
              value={cert.credentialId ?? ''}
              onChange={(credentialId) => updateCertificate(cert.id, { credentialId })}
            />
            <FormField
              id={`${cert.id}-url`}
              label="Lien de vérification"
              value={cert.url ?? ''}
              onChange={(url) => updateCertificate(cert.id, { url })}
              placeholder="https://…"
            />
          </div>
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
            label="Fonction / relation"
            value={ref.role ?? ''}
            onChange={(role) => updateReference(ref.id, { role })}
            placeholder="ex. Ancien responsable direct"
          />
          <FormField
            id={`${ref.id}-organization`}
            label="Organisation"
            value={ref.organization ?? ''}
            onChange={(organization) => updateReference(ref.id, { organization })}
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
