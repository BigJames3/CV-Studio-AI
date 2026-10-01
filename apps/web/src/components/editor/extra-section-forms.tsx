'use client';

import { Fragment, type ReactNode } from 'react';
import { useEditorStore, type ExtraListItems, type ExtraListKey } from '@/stores/editor-store';
import {
  AVAILABILITY_SUGGESTIONS,
  DATE_PLACEHOLDER,
  MOBILITY_OPTIONS,
  PUBLICATION_TYPES,
  TALK_ROLES,
} from '@/lib/templates/cv-options';
import {
  AddItemButton,
  CheckboxField,
  FormField,
  FormTextarea,
  SectionCard,
  Suggestions,
} from './form-primitives';

/** A field of an optional-section item; `half` fields pair up on one row. */
type FieldDef<K extends ExtraListKey> = {
  key: keyof ExtraListItems[K] & string;
  label: string;
  kind?: 'text' | 'textarea' | 'current';
  placeholder?: string;
  list?: string;
  half?: boolean;
};

type Item = { id: string } & Record<string, unknown>;

function ExtraListEditor<K extends ExtraListKey>({
  list,
  heading,
  itemLabel,
  addLabel,
  fields,
  empty,
  titleKeys,
}: {
  list: K;
  heading: string;
  itemLabel: string;
  addLabel: string;
  fields: FieldDef<K>[];
  empty: Omit<ExtraListItems[K], 'id'>;
  /** First non-empty value among these keys titles the card. */
  titleKeys: Array<keyof ExtraListItems[K] & string>;
}) {
  const items = useEditorStore((s) => (s.content[list] ?? []) as unknown as Item[]);
  const addExtraItem = useEditorStore((s) => s.addExtraItem);
  const updateExtraItem = useEditorStore((s) => s.updateExtraItem);
  const removeExtraItem = useEditorStore((s) => s.removeExtraItem);
  const moveItem = useEditorStore((s) => s.moveItem);

  const update = (id: string, patch: Record<string, unknown>) =>
    updateExtraItem(list, id, patch as Partial<ExtraListItems[K]>);

  return (
    <section className="space-y-3" data-testid={`${list}-form`}>
      <h3 className="text-sm font-semibold">{heading}</h3>
      {items.map((item, index) => {
        const title = titleKeys.map((k) => String(item[k] ?? '').trim()).find(Boolean);
        return (
          <SectionCard
            key={item.id}
            title={title || `${itemLabel} ${index + 1}`}
            onRemove={() => removeExtraItem(list, item.id)}
            onMoveUp={() => moveItem(list, item.id, 'up')}
            onMoveDown={() => moveItem(list, item.id, 'down')}
            canMoveUp={index > 0}
            canMoveDown={index < items.length - 1}
          >
            {rows(fields).map((row, r) => {
              const cells = row.map((f) => (
                <FieldInput key={f.key} field={f} item={item} update={update} />
              ));
              return row.length > 1 ? (
                <div key={r} className="grid grid-cols-2 gap-3">
                  {cells}
                </div>
              ) : (
                <Fragment key={r}>{cells}</Fragment>
              );
            })}
          </SectionCard>
        );
      })}
      <AddItemButton label={addLabel} onClick={() => addExtraItem(list, empty)} />
    </section>
  );
}

/** Groups consecutive `half` fields two by two. */
function rows<F extends { half?: boolean }>(fields: F[]): F[][] {
  const out: F[][] = [];
  for (const f of fields) {
    const last = out[out.length - 1];
    if (f.half && last && last.length === 1 && last[0].half) last.push(f);
    else out.push([f]);
  }
  return out;
}

function FieldInput<K extends ExtraListKey>({
  field,
  item,
  update,
}: {
  field: FieldDef<K>;
  item: Item;
  update: (id: string, patch: Record<string, unknown>) => void;
}) {
  const id = `${item.id}-${field.key}`;
  const value = String(item[field.key] ?? '');
  if (field.kind === 'current') {
    return (
      <CheckboxField
        label={field.label}
        checked={Boolean(item.current)}
        onChange={(current) => update(item.id, { current, ...(current ? { end: '' } : {}) })}
      />
    );
  }
  if (field.kind === 'textarea') {
    return (
      <FormTextarea
        id={id}
        label={field.label}
        value={value}
        onChange={(v) => update(item.id, { [field.key]: v })}
        placeholder={field.placeholder}
        rows={3}
      />
    );
  }
  const disabledEnd = field.key === 'end' && Boolean(item.current);
  return (
    <FormField
      id={id}
      label={field.label}
      list={field.list}
      value={disabledEnd ? '' : value}
      onChange={(v) =>
        update(item.id, { [field.key]: v, ...(field.key === 'end' ? { current: false } : {}) })
      }
      placeholder={field.placeholder}
    />
  );
}

/** Distinctions, bénévolat, publications, conférences. */
export function ActivitiesForm() {
  return (
    <div className="space-y-6" data-testid="activities-form">
      <ExtraListEditor
        list="awards"
        heading="Prix et distinctions"
        itemLabel="Distinction"
        addLabel="+ Ajouter une distinction"
        empty={{ name: '', issuer: '', date: '', description: '' }}
        titleKeys={['name']}
        fields={[
          { key: 'name', label: 'Nom du prix / de la distinction' },
          { key: 'issuer', label: 'Organisme', half: true },
          { key: 'date', label: 'Date', placeholder: DATE_PLACEHOLDER, half: true },
          { key: 'description', label: 'Description (facultative)', kind: 'textarea' },
        ]}
      />
      <ExtraListEditor
        list="volunteering"
        heading="Bénévolat et engagements"
        itemLabel="Engagement"
        addLabel="+ Ajouter un engagement"
        empty={{ organization: '', role: '', location: '', start: '', end: '', description: '' }}
        titleKeys={['role', 'organization']}
        fields={[
          { key: 'organization', label: 'Organisation', half: true },
          { key: 'role', label: 'Fonction', half: true },
          { key: 'location', label: 'Ville / pays' },
          { key: 'start', label: 'Début', placeholder: DATE_PLACEHOLDER, half: true },
          { key: 'end', label: 'Fin', placeholder: DATE_PLACEHOLDER, half: true },
          { key: 'current', label: 'Engagement en cours', kind: 'current' },
          {
            key: 'description',
            label: 'Missions et réalisations',
            kind: 'textarea',
          },
        ]}
      />
      <ExtraListEditor
        list="publications"
        heading="Publications"
        itemLabel="Publication"
        addLabel="+ Ajouter une publication"
        empty={{ title: '', type: '', authors: '', publisher: '', date: '', url: '' }}
        titleKeys={['title']}
        fields={[
          { key: 'title', label: 'Titre' },
          { key: 'type', label: 'Type', list: 'cv-publication-types', half: true },
          { key: 'date', label: 'Date', placeholder: DATE_PLACEHOLDER, half: true },
          { key: 'publisher', label: 'Journal / plateforme', half: true },
          { key: 'authors', label: 'Auteur(s)', half: true },
          { key: 'url', label: 'Lien', placeholder: 'https://…' },
        ]}
      />
      <ExtraListEditor
        list="talks"
        heading="Conférences et interventions"
        itemLabel="Intervention"
        addLabel="+ Ajouter une intervention"
        empty={{ event: '', topic: '', role: '', organizer: '', location: '', date: '' }}
        titleKeys={['topic', 'event']}
        fields={[
          { key: 'event', label: 'Événement' },
          { key: 'topic', label: 'Sujet' },
          { key: 'role', label: 'Rôle', list: 'cv-talk-roles', half: true },
          { key: 'organizer', label: 'Organisateur', half: true },
          { key: 'location', label: 'Lieu', half: true },
          { key: 'date', label: 'Date', placeholder: DATE_PLACEHOLDER, half: true },
        ]}
      />
      <Suggestions id="cv-publication-types" values={PUBLICATION_TYPES} />
      <Suggestions id="cv-talk-roles" values={TALK_ROLES} />
    </div>
  );
}

/** Disponibilité, mobilité, permis, centres d'intérêt, informations propres au métier. */
export function MoreInfoForm() {
  const extras = useEditorStore((s) => s.content.extras ?? {});
  const patchExtras = useEditorStore((s) => s.patchExtras);
  const mobility = extras.mobility ?? [];

  return (
    <div className="space-y-6" data-testid="more-info-form">
      <Group title="Disponibilité">
        <div className="grid grid-cols-2 gap-3">
          <FormField
            id="extras-availability"
            label="Disponibilité"
            list="cv-availability"
            value={extras.availability ?? ''}
            onChange={(availability) => patchExtras({ availability })}
            placeholder="Disponible immédiatement"
          />
          <FormField
            id="extras-notice"
            label="Préavis"
            value={extras.notice ?? ''}
            onChange={(notice) => patchExtras({ notice })}
            placeholder="1 mois"
          />
        </div>
        <Suggestions id="cv-availability" values={AVAILABILITY_SUGGESTIONS} />
      </Group>

      <Group title="Mobilité">
        <FormField
          id="extras-desired-location"
          label="Ville / pays souhaités"
          value={extras.desiredLocation ?? ''}
          onChange={(desiredLocation) => patchExtras({ desiredLocation })}
        />
        <div className="grid grid-cols-2 gap-2">
          {MOBILITY_OPTIONS.map((option) => (
            <CheckboxField
              key={option}
              label={option}
              checked={mobility.includes(option)}
              onChange={(checked) =>
                patchExtras({
                  // Keep the fixed order so the CV reads the same whatever the click order.
                  mobility: MOBILITY_OPTIONS.filter((o) =>
                    o === option ? checked : mobility.includes(o)
                  ),
                })
              }
            />
          ))}
        </div>
      </Group>

      <ExtraListEditor
        list="licenses"
        heading="Permis et habilitations"
        itemLabel="Permis"
        addLabel="+ Ajouter un permis ou une habilitation"
        empty={{ name: '', issuer: '', date: '', expires: '' }}
        titleKeys={['name']}
        fields={[
          { key: 'name', label: 'Type', placeholder: 'Permis B, habilitation électrique…' },
          { key: 'issuer', label: 'Autorité / organisme' },
          { key: 'date', label: 'Date d’obtention', placeholder: DATE_PLACEHOLDER, half: true },
          { key: 'expires', label: 'Expiration', placeholder: DATE_PLACEHOLDER, half: true },
        ]}
      />

      <ExtraListEditor
        list="interests"
        heading="Centres d’intérêt"
        itemLabel="Centre d’intérêt"
        addLabel="+ Ajouter un centre d’intérêt"
        empty={{ name: '' }}
        titleKeys={['name']}
        fields={[{ key: 'name', label: 'Centre d’intérêt', placeholder: 'Photographie' }]}
      />

      <ExtraListEditor
        list="additionalInfo"
        heading="Informations complémentaires"
        itemLabel="Information"
        addLabel="+ Ajouter une information"
        empty={{ label: '', value: '' }}
        titleKeys={['label', 'value']}
        fields={[
          {
            key: 'label',
            label: 'Intitulé',
            placeholder: 'Ordre professionnel, zones couvertes…',
            half: true,
          },
          { key: 'value', label: 'Valeur', half: true },
        ]}
      />
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}
