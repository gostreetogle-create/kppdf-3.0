const assert = require("assert");
const { buildPurpose, extractPurposeFromDescription } = require("./fill-product-purpose");

function test(label, fn) {
  try {
    fn();
    console.log(`  ✓ ${label}`);
  } catch (e) {
    console.error(`  ✗ ${label}`);
    throw e;
  }
}

console.log("fill-product-purpose tests\n");

test("баскетбол по подкатегории", () => {
  const p = buildPurpose({
    name: "Стойка баскетбольная",
    description: "",
    category: "Спортивное оборудование",
    subcategory: "Баскетбол",
  });
  assert.ok(p.startsWith("Предназначено для"));
  assert.ok(p.includes("баскетбол"));
});

test("сетка ворот по названию", () => {
  const p = buildPurpose({
    name: "Сетка белая для ворот футбольных",
    description: "",
    category: "Спортивное оборудование",
    subcategory: "Сетки для ворот",
  });
  assert.ok(p.includes("ворот") || p.includes("мяч"));
});

test("воркаут турник", () => {
  const p = buildPurpose({
    name: "Турник уличный СК001",
    description: "",
    category: "Воркаут",
    subcategory: "Турники",
  });
  assert.ok(p.includes("перекладин") || p.includes("турник") || p.includes("воркаут"));
});

test("ГТО из описания — испытание", () => {
  const p = buildPurpose({
    name: "Горизонтальная гимнастическая скамья",
    description: "для выполнения испытания «Поднимание туловища из положения лежа на спине»",
    category: "ГТО",
    subcategory: "ГТО",
  });
  assert.ok(p.includes("Поднимание туловища"));
  assert.ok(p.startsWith("Предназначено для выполнения испытания «"));
});

test("ГТО информационная стойка", () => {
  const p = buildPurpose({
    name: "Информационная стойка с описанием нормативов испытаний",
    description: "Всероссийского физкультурно-спортивного комплекса «Готов к труду и обороне»",
    category: "ГТО",
    subcategory: "ГТО",
  });
  assert.ok(p.includes("Готов к труду и обороне"));
});

test("ГТО ОВЗ — мишень", () => {
  const p = buildPurpose({
    name: "Мишень на стойках квадратная для тестирования инвалидов и лиц с",
    description: "ограниченными возможностями здоровья, габариты отверстия 1,5x1,5 м",
    category: "ГТО",
    subcategory: "ГТО",
  });
  assert.ok(p.includes("ограниченными возможностями здоровья"));
});

test("резиновое покрытие — искусственная трава из описания", () => {
  const p = buildPurpose({
    name: "Искусственная трава",
    description: 'ворс 40 мм "WAEL-4024120-14T" (Искусственная трава с высотой ворса от 40 мм)',
    category: "Резиновое покрытие",
    subcategory: "Резиновое покрытие",
  });
  assert.ok(p.includes("искусственной травы"));
});

test("МАФ — остановочный павильон", () => {
  const p = buildPurpose({
    name: "Остановочный павильон (Автопавильон). Тип: 1",
    description: "",
    category: "Малые архитектурные формы",
    subcategory: "Павильоны",
  });
  assert.ok(p.includes("ожидания пассажиров") || p.includes("остановках"));
});

test("МАФ — урна из описания с материалами", () => {
  const p = buildPurpose({
    name: "Урна Город",
    description: "Размер (мм):400х400х1000 оцинкованный металл с порошковой краской",
    category: "Малые архитектурные формы",
    subcategory: "Урны",
  });
  assert.ok(p.includes("сбора мусора") || p.includes("чистоты"));
});

test("extractPurposeFromDescription — фрагмент пресса", () => {
  const clause = extractPurposeFromDescription(
    "Комплекс для тренировки мышц верхнего плечевого пояса и",
    "пресса",
  );
  assert.ok(clause.includes("пресса"));
});

console.log("\nAll tests passed.");
