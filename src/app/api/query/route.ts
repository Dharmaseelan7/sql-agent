import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { naturalLanguageToSQL } from "@/lib/gemini";

const prisma = new PrismaClient();

async function getSchemaDescription() {
  // Fetch the database name
  const dbNameResult = await prisma.$queryRawUnsafe(
    `SELECT DATABASE() AS db_name`
  ) as [{ db_name: string }];

  const dbName = dbNameResult[0].db_name;

  // Fetch all tables
  const allTables = await prisma.$queryRawUnsafe(
    `SELECT table_name AS table_name
     FROM information_schema.tables 
     WHERE table_schema = DATABASE()`
  ) as { table_name: string }[];

  // Get restricted tables
  const restricted = process.env.RESTRICTED_TABLES?.split(",").map(t => t.trim().toLowerCase()) || [];

  // Filter allowed tables
  const allowedTables = allTables
    .map(t => t.table_name)
    .filter(Boolean)
    .filter(tableName => !restricted.includes(tableName.toLowerCase()));

  // Build schema description
  let schemaDescription = `Database name: ${dbName}\n`; // Add database name here
  for (const table of allowedTables) {
    const cols = await prisma.$queryRawUnsafe(
      `SELECT column_name AS column_name, data_type AS data_type
       FROM information_schema.columns 
       WHERE table_schema = DATABASE() 
       AND table_name = '${table}'`
    ) as { column_name: string, data_type: string }[];

    schemaDescription += `\nTable: ${table} (${cols.map(c => `${c.column_name} ${c.data_type}`).join(", ")})`;
  }

  return schemaDescription.trim();
}


export async function POST(req: NextRequest) {
  try {
    const { question, history } = await req.json();

    const schemaDescription = await getSchemaDescription();

    type HistoryItem = { role: string; content: string | object };
    const conversationContext = (history as HistoryItem[])
      .map(h => `${h.role}: ${typeof h.content === "string" ? h.content : JSON.stringify(h.content)}`)
      .join("\n");

    console.log("User Question:", question);
    console.log("schemaDescription",schemaDescription);

    // Step 2: Get structured response from model
    const { mode, content } = await naturalLanguageToSQL(
      question,
      schemaDescription,
      conversationContext
    );

    console.log("AI Mode:", mode);

    if (mode === "sql") {
      // Step 3: Execute the SQL query
      const result = await prisma.$queryRawUnsafe(content);
      console.log("Query Result:", result);
      return NextResponse.json({ mode, sqlQuery: content, result });
    } else if (mode === "explanation") {
      // Step 4: Return explanation directly
      return NextResponse.json({ mode, result: content });
    } else {
      throw new Error(`Unknown mode returned: ${mode}`);
    }

  } catch (error) {
    console.error("Error in POST /api:", error);
    return NextResponse.json({ error: "Failed to process query" }, { status: 500 });
  }
}
