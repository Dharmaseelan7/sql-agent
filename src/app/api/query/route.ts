import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import {naturalLanguageToSQL} from "@/lib/gemini";

const prisma = new PrismaClient();

async function getSchemaDescription() {
    const allTables = await prisma.$queryRawUnsafe(
        `SELECT table_name AS table_name
        FROM information_schema.tables 
        WHERE table_schema = DATABASE()`
    ) as { table_name: string }[];

    const restricted = process.env.RESTRICTED_TABLES?.split(",").map(t => t.trim().toLowerCase()) || [];

    const allowedTables = allTables
    .map(t => t.table_name)
    .filter(Boolean)
    .filter(tableName => !restricted.includes(tableName.toLowerCase()));
    
  // 3️⃣ Build schema description for Gemini
  let schemaDescription = "";
  for (const table of allowedTables) {
    const cols = await prisma.$queryRawUnsafe(
        `SELECT column_name AS column_name, data_type AS data_type
        FROM information_schema.columns 
        WHERE table_schema = DATABASE() 
        AND table_name = '${table}'`
    ) as { column_name: string, data_type: string }[];
    schemaDescription += `Table: ${table} (${cols.map(c => `${c.column_name} ${c.data_type}`).join(", ")})\n`;
  }
  console.log("Schema Description:", schemaDescription);
  return schemaDescription.trim();
}


export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();

    // Step 1: Build schema dynamically
    const schemaDescription = await getSchemaDescription();

    console.log("question",question);

    console.log("Schema Description:", schemaDescription);


    // Step 2: Convert NL → SQL
    const sqlQuery = await naturalLanguageToSQL(question, schemaDescription);
    
    console.log("Generated SQL Query:", sqlQuery);
    // Step 3: Execute SQL
    const result = await prisma.$queryRawUnsafe(sqlQuery);
    console.log("Query Result:", result);

    return NextResponse.json({ sqlQuery, result });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to process query" }, { status: 500 });
  }
}
