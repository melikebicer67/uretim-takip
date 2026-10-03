// Nest 12, Next 16 ve Prisma 7 Node 22 ister
const major = Number(process.versions.node.split('.')[0]);
if (major < 22) {
  console.error(`\nNode ${process.versions.node} kullanılıyor, Node 22 gerekli.\nÇalıştırın: nvm use   (proje kökündeki .nvmrc'yi okur)\n`);
  process.exit(1);
}
