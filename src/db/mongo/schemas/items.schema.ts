import {index, modelOptions, prop} from "@typegoose/typegoose";

@modelOptions({ schemaOptions: { timestamps: true, collection: 'items' }, options: { customName: 'items' } })
@index({ 'expansion': 1 }, { name: 'C' })
@index(
  {
    'ticker': 'text',
    'name.en_GB': 'text',
    'name.ru_RU': 'text',
    'tags': 'text'
  },
  {
    weights:
      {
        'ticker': 2,
        'name.en_GB': 2,
        'name.ru_RU': 2,
        'tags': 1
      },
    name: 'SQ',
  }
)

class ItemNames {
  @prop({ required: true })
  public en_US!: string;
  @prop({ required: true })
  public es_MX!: string;
  @prop({ required: true })
  public pt_BR!: string;
  @prop({ required: true })
  public de_DE!: string;
  @prop({ required: true })
  public en_GB!: string;
  @prop({ required: true })
  public es_ES!: string;
  @prop({ required: true })
  public fr_FR!: string;
  @prop({ required: true })
  public it_IT!: string;
  @prop({ required: true })
  public ru_RU!: string;
}

export class Item {
  @prop({ required: true })
  public _id!: number;
  @prop({ type: ItemNames })
  public name?: ItemNames;
  @prop()
  public quality?: string;
  @prop()
  public ilvl?: number;
  @prop()
  public level?: number;
  @prop()
  public icon?: string;
  @prop()
  public icon_class?: string;
  @prop()
  public icon_subclass?: string;
  @prop()
  public purchase_price?: number;
  @prop()
  public purchase_quantity?: number;
  @prop()
  public sell_price?: number;
  @prop()
  public is_equippable?: boolean;
  @prop()
  public is_stackable?: boolean;
  @prop()
  public inventory_type?: string;
  @prop()
  public loot_type?: string;
  @prop({ required: true, default: false })
  public contracts!: boolean;
  /** add via indexAssetClass - csv import */
  @prop({ type: () => [String] })
  public asset_class!: string[];
  /** add via importTaxonomy_CSV('itemsparse') */
  @prop()
  public expansion?: string;
  @prop()
  public stackable?: number;
  /** add via importTaxonomy_CSV('taxonomy') */
  @prop()
  public profession_class?: string;
  @prop()
  public ticker?: string;
  @prop({ type: () => [String] })
  public tags!: string[];
}
