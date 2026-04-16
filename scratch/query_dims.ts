import prisma from '../src/lib/db'

async function main() {
  const result = await prisma.$queryRawUnsafe(`SELECT vector_dims(embedding) as dims, count(*) as count FROM "DocumentChunk" GROUP BY vector_dims(embedding);`)
  console.log(result)
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
