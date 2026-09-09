import { X_PORTRAIT_SHEETS } from "./x-builder-artwork.js";
import { X_BUILDERS } from "./x-builders.js";
import { BUILDERS, OPENAI_BUILDERS } from "./data.js";
// The first nine portrait slots are stable so existing collections keep their identities.
export const PORTRAIT_SHEETS = [
  { file: "builders-01.png", start: 0, columns: 3, rows: 1 },
  { file: "builders-02.png", start: 3, columns: 3, rows: 1 },
  { file: "builders-03.png", start: 6, columns: 3, rows: 1 },
  { file: "builders-04.png", start: 9, columns: 2, rows: 2 },
  { file: "builders-05.png", start: 13, columns: 2, rows: 2 },
  { file: "builders-06.png", start: 17, columns: 2, rows: 2 },
  { file: "builders-07.png", start: 21, columns: 2, rows: 2 },
  { file: "builders-08.png", start: 25, columns: 2, rows: 2 },
  { file: "builders-09.png", start: 29, columns: 1, rows: 1 },
  { file: "builders-charlie-marsh.png", start: 30, columns: 1, rows: 1 },
  { file: "builders-victor-nunez.png", start: 31, columns: 1, rows: 1 },
  ...X_BUILDERS.map((builder, index) => ({ file: builder.portrait, start: OPENAI_BUILDERS.length + index, columns: 1, rows: 1 })).filter(sheet => sheet.file && BUILDERS[sheet.start].retired),
  ...X_PORTRAIT_SHEETS,
];

export function portraitLocation(person) {
  if (!Number.isInteger(person)) throw new RangeError(`No portrait for builder ${person}`);
  const illustrated = PORTRAIT_SHEETS.findIndex(sheet => sheet.people?.includes(person));
  if (illustrated === -1 && BUILDERS[person]?.portraitPerson !== undefined) {
    return portraitLocation(BUILDERS[person].portraitPerson);
  }
  const sheetIndex = illustrated !== -1 ? illustrated : PORTRAIT_SHEETS.findIndex((s) =>
    person >= s.start && person < s.start + s.columns * s.rows,
  );
  if (sheetIndex === -1) throw new RangeError(`No portrait for builder ${person}`);
  const sheet = PORTRAIT_SHEETS[sheetIndex];
  const cell = sheet.people ? sheet.people.indexOf(person) : person - sheet.start;
  return { sheetIndex, columns: sheet.columns, rows: sheet.rows, column: cell % sheet.columns, row: Math.floor(cell / sheet.columns) };
}
