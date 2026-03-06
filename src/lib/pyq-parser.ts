import { Question } from "@/lib/schemas";

/**
 * Attempts to parse structured PYQ text locally without AI.
 * Handles formats like:
 *   From: UGC NET/JRF English Paper II, December 2004, Page: 4
 *   1. Question text here...
 *   (a) Option A  (b) Option B
 *   (c) Option C  (d) Option D
 *   Ans : (d) Explanation text here...
 *
 * Key design decisions:
 * - Only LOWERCASE (a)-(d) are treated as answer options
 * - UPPERCASE (A)-(D) are kept as part of the question stem
 * - Multiple options on the same line are handled
 * - Question numbers limited to 1-200 to avoid matching years
 * - Ans/Ans:/Ans./Answer: all supported
 *
 * Returns null if the text doesn't match the expected PYQ format.
 */
export function parsePYQText(text: string): Question[] | null {
    // Quick pre-check: must have lowercase options and an answer marker
    if (!/\(\s*[a-d]\s*\)/.test(text)) return null;
    if (!/Ans\s*[:.：]\s*\(\s*[a-d*]\s*\)/i.test(text)) return null;

    const questions: Question[] = [];
    let currentSource: string | undefined;

    const lines = text.split(/\n/);
    let i = 0;

    while (i < lines.length) {
        const line = lines[i].trim();

        // Check for "From:" source line
        const fromMatch = line.match(/^From\s*[:：]\s*(.+?)(?:,\s*Page\s*[:：]\s*\d+)?$/i);
        if (fromMatch) {
            currentSource = fromMatch[1].trim().replace(/,\s*$/, "");
            i++;
            continue;
        }

        // Check for question start: number (1-200) followed by period/paren
        const qNumMatch = line.match(/^(\d{1,3})\s*[.)]\s*$/);
        const qNumInlineMatch = !qNumMatch ? line.match(/^(\d{1,3})\s*[.)]\s+(.+)/) : null;

        if (!qNumMatch && !qNumInlineMatch) {
            i++;
            continue;
        }

        // Skip numbers > 200 (likely years like 1668)
        const qNum = parseInt((qNumMatch || qNumInlineMatch)![1]);
        if (qNum > 200) { i++; continue; }

        // Found a question — collect all lines until the next question or From:
        const questionLines: string[] = [];
        if (qNumInlineMatch) {
            questionLines.push(qNumInlineMatch[2]);
        }
        i++;

        while (i < lines.length) {
            const nextLine = lines[i].trim();
            // Stop if we hit next question number (1-200) or From: line
            if (/^\d{1,3}\s*[.)]\s*$/.test(nextLine)) {
                const nextNum = parseInt(nextLine.match(/^(\d{1,3})/)![1]);
                if (nextNum <= 200) break;
            }
            if (/^\d{1,3}\s*[.)]\s+\S/.test(nextLine)) {
                const nextNum = parseInt(nextLine.match(/^(\d{1,3})/)![1]);
                if (nextNum <= 200) break;
            }
            if (/^From\s*[:：]\s*/i.test(nextLine)) break;
            questionLines.push(nextLine);
            i++;
        }

        const block = questionLines.join("\n");
        const parsed = parseQuestionBlock(block, currentSource);
        if (parsed) {
            questions.push(parsed);
        }
    }

    return questions.length > 0 ? questions : null;
}

/**
 * Attempts to parse "Match List I with List II" patterns into a Markdown table.
 * If successful, returns the formatted string. Otherwise returns the original text.
 */
function formatMatchListTable(text: string): string {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    let output: string[] = [];

    let headerText: string[] = [];
    let tableRows: { col1: string; col2: string }[] = [];
    let currentRow = { col1: "", col2: "" };
    let lastPushed: 'col1' | 'col2' | 'header' | null = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/^[A-E]\s*\./i.test(line)) {
            if (currentRow.col1 && !currentRow.col2) {
                tableRows.push(currentRow);
                currentRow = { col1: "", col2: "" };
            }
            if (currentRow.col2) {
                tableRows.push(currentRow);
                currentRow = { col1: "", col2: "" };
            }
            currentRow.col1 = line;
            lastPushed = 'col1';
        } else if (/^[IVX]+\s*\./i.test(line)) {
            currentRow.col2 = line;
            lastPushed = 'col2';
        } else {
            // Continuation line
            if (lastPushed === 'col2') {
                currentRow.col2 += " " + line;
            } else if (lastPushed === 'col1') {
                currentRow.col1 += " " + line;
            } else {
                headerText.push(line);
                lastPushed = 'header';
            }
        }
    }
    if (currentRow.col1 || currentRow.col2) tableRows.push(currentRow);

    if (tableRows.length > 0) {
        headerText = headerText.filter(l => !/^(List I|List II)$/i.test(l));

        output.push(headerText.join(" "));
        output.push("\n| List I | List II |");
        output.push("|---|---|");
        tableRows.forEach(row => {
            output.push(`| ${row.col1} | ${row.col2} |`);
        });
        return output.join("\n");
    }

    return lines.join("\n\n");
}

function parseQuestionBlock(block: string, source?: string): Question | null {
    // Find the Ans marker: Ans:(d), Ans : (d), Ans.(d), Answer: (d), Ans: (*)
    const ansMatch = block.match(/Ans(?:wer)?\s*[:.：]\s*\(\s*([a-d*])\s*\)/i);
    if (!ansMatch || ansMatch.index === undefined) return null;

    const correctLetter = ansMatch[1].toLowerCase();

    // Explanation = everything after the Ans match
    const explanation = block
        .substring(ansMatch.index + ansMatch[0].length)
        .replace(/\s+/g, " ")
        .trim();

    // Before Ans = question text + options
    const beforeAns = block.substring(0, ansMatch.index);

    // Find all LOWERCASE option markers: (a), (b), (c), (d)
    // Uppercase (A)-(D) are intentionally NOT matched — they're question stem items
    const optionRegex = /\(\s*([a-d])\s*\)/g;
    const optionPositions: { letter: string; index: number; length: number }[] = [];
    let m;
    while ((m = optionRegex.exec(beforeAns)) !== null) {
        optionPositions.push({
            letter: m[1].toLowerCase(),
            index: m.index,
            length: m[0].length,
        });
    }

    if (optionPositions.length < 2) return null;

    // Question text = everything before the first lowercase (a)
    let rawQuestionText = beforeAns.substring(0, optionPositions[0].index);

    // Clean common suffixes from question text
    let questionText = rawQuestionText
        .replace(/Choose the correct answer from the options\s*given below\s*[:.]?\s*$/i, "")
        .replace(/Select the correct option\s*[:.]?\s*$/i, "")
        .trim();

    if (/Match List/i.test(questionText)) {
        questionText = formatMatchListTable(questionText);
    } else {
        questionText = questionText.replace(/\s+/g, " ");
    }

    // Extract option texts between markers
    const options = optionPositions.map((opt, idx) => {
        const start = opt.index + opt.length;
        const end = idx < optionPositions.length - 1
            ? optionPositions[idx + 1].index
            : beforeAns.length;
        return {
            letter: opt.letter,
            text: beforeAns.substring(start, end).replace(/\s+/g, " ").trim(),
        };
    });

    // If no question text found, use a placeholder
    if (!questionText) {
        questionText = "(See options below)";
    }

    // Build clean options with sequential IDs
    const cleanOptions = options.map((opt, idx) => ({
        id: `option-${String.fromCharCode(65 + idx)}`,
        text: opt.text,
    }));

    // Map correct answer letter to index-based ID
    let correctAnswerId: string;
    if (correctLetter === "*") {
        // "All correct" — default to first option
        correctAnswerId = cleanOptions[0].id;
    } else {
        const correctIdx = options.findIndex(o => o.letter === correctLetter);
        correctAnswerId = correctIdx >= 0
            ? cleanOptions[correctIdx].id
            : cleanOptions[0].id;
    }

    // Determine type
    const type: "multiple-choice" | "true-false" =
        options.length === 2 &&
            options.some(o => /^true$/i.test(o.text)) &&
            options.some(o => /^false$/i.test(o.text))
            ? "true-false"
            : "multiple-choice";

    return {
        id: Math.random().toString(36).substring(7),
        text: questionText,
        options: cleanOptions,
        correctAnswerId,
        explanation: explanation || "No explanation provided.",
        type,
        categoryId: "temp-category",
        createdAt: Date.now(),
        source,
    };
}
