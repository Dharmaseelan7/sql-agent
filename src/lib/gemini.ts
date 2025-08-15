import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function naturalLanguageToSQL(
  question: string,
  schemaDescription: string,
  conversationHistory: string = ""
) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
  You are an expert MySQL database assistant that can operate in two modes.

  ## Conversation History:
  ${conversationHistory}

  ## Goals:
  1. **If the question can be answered by running a database query:**
    - mode = "sql"
    - Convert the latest user question into a valid, optimized MySQL SELECT query.
    - You must use ONLY the tables and columns listed in the provided schema.
    - Avoid unsafe operations like DROP, DELETE, UPDATE, INSERT.
    - Always produce a read-only SELECT query.
    - For counts or numeric aggregates, cast results to signed integers to avoid BigInt serialization issues in JavaScript (e.g., use CAST(COUNT(*) AS SIGNED) AS count).
    - Use aliases that are lowercase and underscore separated.
    - If user asks for non-tabular output like charts, still produce the SQL first.
    - Return ONLY the SQL string in the "content" field.

  2. **If the question is about the database itself (e.g., architecture, table relationships, schema overview):**
    - mode = "explanation"
    - Provide a clear, concise, and structured explanation in plain English.
    - You may include bullet points, numbered lists, or ASCII diagrams if useful.
    - Focus only on the schema and tables provided.
    - Avoid making up tables or fields that don’t exist in the provided schema.
    - Return ONLY the explanation text in the "content" field.

  ## Schema:
  ${schemaDescription}

  ## Current Question:
  ${question}

  ## Output Format:
  Return your final answer as a JSON object in this exact shape:
  {
    "mode": "sql" | "explanation",
    "content": "string"
  }
  `;

  const result = await model.generateContent(prompt);
  const resultText = result.response.text().trim();
  const cleanedText = resultText.replace(/```(?:sql|json)?/g, "").replace(/```/g, "").trim();

  return JSON.parse(cleanedText);

}
