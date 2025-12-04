const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// 读取 JSON 数据
const jsonData = JSON.parse(fs.readFileSync('ptcg_chs_infos.json', 'utf8'));

console.log(jsonData.dict ? `读取到字典数据，类型数量: ${Object.keys(jsonData.dict).length}` : '未找到字典数据');
console.log(jsonData.collections ? `读取到集合数据，集合数量: ${jsonData.collections.length}` : '未找到集合数据');

// 创建数据库
const dbPath = 'cards_cn.db';
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}
const db = new Database(dbPath);

// 启用外键约束
db.pragma('foreign_keys = ON');

// 创建表结构
db.exec(`
  -- 字典项表（存储所有枚举类型数据）
  CREATE TABLE dict_items (
    id INTEGER PRIMARY KEY,
    type_code TEXT NOT NULL,
    dict_code TEXT NOT NULL,
    dict_value TEXT NOT NULL,
    dict_sort INTEGER,
    status INTEGER DEFAULT 1,
    UNIQUE(type_code, dict_code)
  );
  CREATE INDEX idx_dict_items_type_code ON dict_items(type_code);

  -- 卡包集合表
  CREATE TABLE collections (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    commodity_code TEXT UNIQUE,
    sales_date TEXT,
    series TEXT,
    series_text TEXT,
    goods_type TEXT,
    link_type INTEGER,
    image TEXT
  );
  CREATE INDEX idx_collections_commodity_code ON collections(commodity_code);

  -- 卡片主表（移除 collection_id，改用映射表）
  CREATE TABLE cards (
    id INTEGER PRIMARY KEY,
    yoren_code TEXT,
    card_type TEXT,
    card_type_text TEXT,
    pokemon_type TEXT,
    special_card TEXT,
    name_same_pokemon_id INTEGER,
    name TEXT NOT NULL,
    image TEXT,
    hash TEXT,
    -- details 字段
    evolve_text TEXT,
    regulation_mark_text TEXT,
    collection_number TEXT,
    rarity TEXT,
    rarity_text TEXT,
    hp INTEGER,
    attribute TEXT,
    feature_flag TEXT,
    pokemon_category TEXT,
    weakness_type TEXT,
    weakness_formula TEXT,
    resistance_type TEXT,
    resistance_formula TEXT,
    retreat_cost INTEGER,
    pokedex_code TEXT,
    pokedex_text TEXT,
    height REAL,
    weight REAL,
    rule_text TEXT,
    collection_flag INTEGER DEFAULT 0,
    special_shiny_type INTEGER DEFAULT 0
  );
  CREATE INDEX idx_cards_yoren_code ON cards(yoren_code);
  CREATE INDEX idx_cards_name ON cards(name);
  CREATE INDEX idx_cards_card_type ON cards(card_type);

  -- 卡片与集合的映射表（多对多关系）
  CREATE TABLE card_collection_map (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    collection_id INTEGER NOT NULL,
    FOREIGN KEY (card_id) REFERENCES cards(id),
    FOREIGN KEY (collection_id) REFERENCES collections(id),
    UNIQUE(card_id, collection_id)
  );
  CREATE INDEX idx_card_collection_map_card_id ON card_collection_map(card_id);
  CREATE INDEX idx_card_collection_map_collection_id ON card_collection_map(collection_id);

  -- 卡片技能表
  CREATE TABLE card_abilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    ability_name TEXT,
    ability_text TEXT,
    ability_cost TEXT,
    ability_damage TEXT,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (card_id) REFERENCES cards(id)
  );
  CREATE INDEX idx_card_abilities_card_id ON card_abilities(card_id);

  -- 卡片特性表
  CREATE TABLE card_features (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    feature_name TEXT,
    feature_desc TEXT,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (card_id) REFERENCES cards(id)
  );
  CREATE INDEX idx_card_features_card_id ON card_features(card_id);

  -- 卡片所属商品关联表
  CREATE TABLE card_commodities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    commodity_name TEXT,
    commodity_code TEXT,
    FOREIGN KEY (card_id) REFERENCES cards(id)
  );
  CREATE INDEX idx_card_commodities_card_id ON card_commodities(card_id);
  CREATE INDEX idx_card_commodities_commodity_code ON card_commodities(commodity_code);

  -- 卡片画师关联表
  CREATE TABLE card_illustrators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    illustrator_name TEXT,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (card_id) REFERENCES cards(id)
  );
  CREATE INDEX idx_card_illustrators_card_id ON card_illustrators(card_id);
`);

console.log('表结构创建完成');

// 插入字典数据
const insertDict = db.prepare(`
  INSERT INTO dict_items (id, type_code, dict_code, dict_value, dict_sort, status)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertDictMany = db.transaction((dictData) => {
  for (const [typeCode, items] of Object.entries(dictData)) {
    for (const item of items) {
      insertDict.run(item.id, item.typeCode, item.dictCode, item.dictValue, item.dictSort, item.status);
    }
  }
});

insertDictMany(jsonData.dict);
console.log('字典数据插入完成');

// 插入集合数据
const insertCollection = db.prepare(`
  INSERT INTO collections (id, name, commodity_code, sales_date, series, series_text, goods_type, link_type, image)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// 插入卡片数据（移除 collection_id）
const insertCard = db.prepare(`
  INSERT INTO cards (
    id, yoren_code, card_type, card_type_text, pokemon_type, special_card,
    name_same_pokemon_id, name, image, hash,
    evolve_text, regulation_mark_text, collection_number, rarity, rarity_text,
    hp, attribute, feature_flag, pokemon_category,
    weakness_type, weakness_formula, resistance_type, resistance_formula,
    retreat_cost, pokedex_code, pokedex_text, height, weight,
    rule_text, collection_flag, special_shiny_type
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// 插入卡片-集合映射
const insertCardCollectionMap = db.prepare(`
  INSERT OR IGNORE INTO card_collection_map (card_id, collection_id)
  VALUES (?, ?)
`);

// 检查卡片是否已存在
const checkCardExists = db.prepare(`SELECT id FROM cards WHERE id = ?`);

// 插入技能数据
const insertAbility = db.prepare(`
  INSERT INTO card_abilities (card_id, ability_name, ability_text, ability_cost, ability_damage, sort_order)
  VALUES (?, ?, ?, ?, ?, ?)
`);

// 插入特性数据
const insertFeature = db.prepare(`
  INSERT INTO card_features (card_id, feature_name, feature_desc, sort_order)
  VALUES (?, ?, ?, ?)
`);

// 插入商品关联数据
const insertCommodity = db.prepare(`
  INSERT INTO card_commodities (card_id, commodity_name, commodity_code)
  VALUES (?, ?, ?)
`);

// 插入画师数据
const insertIllustrator = db.prepare(`
  INSERT INTO card_illustrators (card_id, illustrator_name, sort_order)
  VALUES (?, ?, ?)
`);

// 记录已插入的卡片ID，避免重复插入
const insertedCardIds = new Set();

// 事务插入所有集合和卡片数据
const insertAllData = db.transaction((collections) => {
  for (const collection of collections) {
    // 插入集合
    insertCollection.run(
      collection.id,
      collection.name,
      collection.commodityCode,
      collection.salesDate,
      collection.series,
      collection.seriesText,
      collection.goodsType,
      collection.linkType,
      collection.image
    );

    // 插入卡片
    if (collection.cards) {
      for (const card of collection.cards) {
        try {
          // 检查卡片是否已插入过
          if (!insertedCardIds.has(card.id)) {
            const details = card.details || {};
            insertCard.run(
              card.id,
              card.yorenCode,
              card.cardType,
              details.cardTypeText,
              card.pokemonType,
              card.specialCard,
              card.nameSamePokemonId,
              card.name,
              card.image,
              card.hash,
              details.evolveText,
              details.regulationMarkText,
              details.collectionNumber,
              details.rarity,
              details.rarityText,
              details.hp,
              details.attribute,
              details.featureFlag,
              details.pokemonCategory,
              details.weaknessType,
              details.weaknessFormula,
              details.resistanceType,
              details.resistanceFormula,
              details.retreatCost,
              details.pokedexCode,
              details.pokedexText,
              details.height,
              details.weight,
              details.ruleText,
              details.collectionFlag,
              details.special_shiny_type
            );

            // 插入技能
            if (details.abilityItemList) {
              details.abilityItemList.forEach((ability, index) => {
                insertAbility.run(
                  card.id,
                  ability.abilityName,
                  ability.abilityText === 'none' ? null : ability.abilityText,
                  ability.abilityCost,
                  ability.abilityDamage === 'none' ? null : ability.abilityDamage,
                  index
                );
              });
            }

            // 插入特性
            if (details.cardFeatureItemList) {
              details.cardFeatureItemList.forEach((feature, index) => {
                insertFeature.run(
                  card.id,
                  feature.featureName,
                  feature.featureDesc,
                  index
                );
              });
            }

            // 插入商品关联
            if (details.commodityList) {
              for (const commodity of details.commodityList) {
                insertCommodity.run(
                  card.id,
                  commodity.commodityName,
                  commodity.commodityCode
                );
              }
            }

            // 插入画师
            if (details.illustratorName) {
              details.illustratorName.forEach((name, index) => {
                insertIllustrator.run(card.id, name, index);
              });
            }

            insertedCardIds.add(card.id);
          }

          // 无论卡片是否已存在，都插入映射关系
          insertCardCollectionMap.run(card.id, collection.id);

        } catch (e) {
          console.log('插入卡片数据时出错，卡片信息如下:' + JSON.stringify(card));
          console.log(e);
        }
      }
    }
  }
});

insertAllData(jsonData.collections);
console.log('集合和卡片数据插入完成');

// 统计信息
const stats = {
  dict_items: db.prepare('SELECT COUNT(*) as count FROM dict_items').get().count,
  collections: db.prepare('SELECT COUNT(*) as count FROM collections').get().count,
  cards: db.prepare('SELECT COUNT(*) as count FROM cards').get().count,
  card_collection_map: db.prepare('SELECT COUNT(*) as count FROM card_collection_map').get().count,
  card_abilities: db.prepare('SELECT COUNT(*) as count FROM card_abilities').get().count,
  card_features: db.prepare('SELECT COUNT(*) as count FROM card_features').get().count,
  card_commodities: db.prepare('SELECT COUNT(*) as count FROM card_commodities').get().count,
  card_illustrators: db.prepare('SELECT COUNT(*) as count FROM card_illustrators').get().count,
};

console.log('\n数据库统计:');
console.log(`- 字典项: ${stats.dict_items} 条`);
console.log(`- 卡包集合: ${stats.collections} 个`);
console.log(`- 卡片: ${stats.cards} 张`);
console.log(`- 卡片-集合映射: ${stats.card_collection_map} 条`);
console.log(`- 技能: ${stats.card_abilities} 个`);
console.log(`- 特性: ${stats.card_features} 个`);
console.log(`- 商品关联: ${stats.card_commodities} 条`);
console.log(`- 画师: ${stats.card_illustrators} 条`);

db.close();
console.log(`\n数据库已保存到: ${dbPath}`);
