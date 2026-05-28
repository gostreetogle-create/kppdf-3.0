const assert = require("assert");
const { stripColorsFromDescription } = require("./strip-description-colors");

function test(label, fn) {
  try {
    fn();
    console.log(`  ✓ ${label}`);
  } catch (e) {
    console.error(`  ✗ ${label}`);
    throw e;
  }
}

console.log("strip-description-colors tests\n");

test("PR0009 — RAL и светлый дуб", () => {
  const out = stripColorsFromDescription(
    "Размер (мм): 2000х641х787 оцинкованный метаалл с нанесением порошковой краски (RAL - 7016 ), дерево лиственница, окрашенное антисептическим маслом (светлый дуб)",
    "RAL 7016; светлый дуб",
  );
  assert.ok(!/RAL\s*7016/i.test(out));
  assert.ok(!/светлый дуб/i.test(out));
  assert.ok(/лиственница/i.test(out));
});

test("PR0001 — павильон, несколько цветов", () => {
  const out = stripColorsFromDescription(
    "Каркас: цельно металлический из профильных труб: 80х80х3мм, 50х50х2мм, 20х20х2мм, 40х40х2мм и 50х25х2мм загрунтован и окрашен в темно - серый цвет. Внешняя обшивка: АКП цвет графитово - серый, подшивка потолка - белый. Остекление: монолитный поликарбонат 880х1500мм толщиной 5мм",
    "белый (подшивка); графитово-серый (АКП); тёмно-серый",
  );
  assert.ok(!/графит/i.test(out));
  assert.ok(!/бел/i.test(out));
  assert.ok(!/т[её]мно\s*[-–]?\s*сер/i.test(out));
  assert.ok(/Остекление/i.test(out));
});

test("OG0024 — цвет корпуса RAL", () => {
  const out = stripColorsFromDescription(
    "8 х 2,4 х 2,4 м Материал корпуса: Сталь Цвет корпуса: RAL 1013",
    "RAL 1013",
  );
  assert.ok(!/RAL\s*1013/i.test(out));
  assert.ok(/Сталь/i.test(out));
});

test("MB0035 — только окраска", () => {
  const out = stripColorsFromDescription(
    "цинконаполненный грунт, порошковая окраска в цвет RAL 7015",
    "RAL 7015",
  );
  assert.equal(out, "цинконаполненный грунт");
});

test("MF0013 — серый мрамор в материалах", () => {
  const out = stripColorsFromDescription(
    "Материалы: серый мрамор, дерево хвойных пород сорта АВ. Габариты: 2100х730х800",
    "серый мрамор",
  );
  assert.ok(!/серый мрамор/i.test(out));
  assert.ok(/дерево хвойных/i.test(out));
});

console.log("\nAll tests passed.");
