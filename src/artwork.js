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
];

export function portraitLocation(person) {
  const sheetIndex = PORTRAIT_SHEETS.findIndex((s) =>
    Number.isInteger(person) && person >= s.start && person < s.start + s.columns * s.rows,
  );
  if (sheetIndex === -1) throw new RangeError(`No portrait for builder ${person}`);
  const sheet = PORTRAIT_SHEETS[sheetIndex];
  const cell = person - sheet.start;
  return { sheetIndex, columns: sheet.columns, rows: sheet.rows, column: cell % sheet.columns, row: Math.floor(cell / sheet.columns) };
}
