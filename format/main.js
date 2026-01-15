import {formatJsonAsync} from './format_json/format.js';
import {createDatabase, insertAllDataAsync} from "./db/sqlite.js";

const jsonData = await formatJsonAsync('./format_json/ptcg_chs_infos.json');

console.log(jsonData);

const db = createDatabase('./db/cards_cn.db');
await insertAllDataAsync(db, jsonData);
console.log("数据已插入数据库：./db/cards_cn.db");