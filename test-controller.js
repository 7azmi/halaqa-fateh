const { readAll, create, update, remove } = require("./controller");

// Example usage (you can comment/uncomment as needed):
async function main() {
  const created = create({ name: "طالب 1", field1: "قيمة 1", field2: "قيمة 2" });
  console.log("Created:", created);

  const all = readAll();
  console.log("All:", all);

  const updated = update(created.id, { name: "طالب 1 المعدل", field1: "قيمة 1 المعدلة", field2: "قيمة 2 المعدلة" });
  console.log("Updated:", updated);

  const removed = remove(created.id);
  console.log("Removed:", removed);

  const allAfterRemove = readAll();
  console.log("All after remove:", allAfterRemove);

  const notFound = remove(999999);
  console.log("Not found:", notFound);
}

main();