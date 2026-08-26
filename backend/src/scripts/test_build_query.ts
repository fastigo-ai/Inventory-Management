import { buildItemQueryAndSort } from './modules/items/item.controller';

const queryCondition = buildItemQueryAndSort({
  search: 'stay',
  filter_circle: 'Solan',
  filter_package: 'Package 1(S/N)'
});

console.log(JSON.stringify(queryCondition, null, 2));
