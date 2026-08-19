import type { ItemDTO, ItemType } from '@xcorpiiion/canonico';

// Shape da API — fonte da verdade: lib canonico
export type Item = ItemDTO;
export type { ItemType };

/** Rótulo em português de cada tipo, para o filtro e para o card. */
export const ITEM_TYPE_LABEL: Record<ItemType, string> = {
  WEAPON: 'arma',
  ARMOR: 'armadura',
  TALISMAN: 'talismã',
  CONSUMABLE: 'consumível',
  MATERIAL: 'material',
  SPELL: 'magia',
  KEY: 'chave',
  OTHER: 'outro',
};

/**
 * A ordem em que os tipos aparecem no filtro.
 *
 * Não é alfabética: arma e armadura são o que se procura primeiro num souls-like, e
 * `OTHER` fecha a lista porque é o balde do que não coube nos outros.
 */
export const ITEM_TYPE_ORDER: ItemType[] = [
  'WEAPON',
  'ARMOR',
  'TALISMAN',
  'SPELL',
  'CONSUMABLE',
  'MATERIAL',
  'KEY',
  'OTHER',
];
