import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function naturalLanguageToSQL(question: string, schemaDescription: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

  const prompt = `
You are an expert MySQL query generator.

## Goals:
- Convert a natural language question into a valid, optimized MySQL query.
- You must use ONLY the tables and columns listed in the provided schema.
- You MUST NOT use any other tables, columns, or schema not listed.
- Avoid unsafe operations like DROP, DELETE, UPDATE, INSERT.
- Always produce a read-only SELECT query.
- For counts or numeric aggregates, cast results to signed integers to avoid BigInt serialization issues in JavaScript (e.g., use CAST(COUNT(*) AS SIGNED) AS count).
- Use aliases that are lowercase and underscore separated.
- If user asks for non-tabular output like charts, still produce the SQL first. The visualization will be handled separately.
- Do NOT include explanations, comments, markdown formatting, or any text outside of the SQL query itself.

## Schema:
${schemaDescription}

## Question:
${question}

## Output:
Return ONLY the SQL query.
`;

  const result = await model.generateContent(prompt);
  return result.response.text().replace(/```sql|```/g, "").trim();
}
