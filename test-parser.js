function parsePYQText(text) {
    if (!/\(\s*[a-d]\s*\)/.test(text)) return null;
    if (!/Ans\s*[:.：]\s*\(\s*[a-d*]\s*\)/i.test(text)) return null;

    const questions = [];
    let currentSource = undefined;

    const lines = text.split(/\n/);
    let i = 0;

    while (i < lines.length) {
        const line = lines[i].trim();

        const fromMatch = line.match(/^From\s*[:：]\s*(.+?)(?:,\s*Page\s*[:：]\s*\d+)?$/i);
        if (fromMatch) {
            currentSource = fromMatch[1].trim().replace(/,\s*$/, "");
            i++;
            continue;
        }

        const qNumMatch = line.match(/^(\d{1,3})\s*[.)]\s*$/);
        const qNumInlineMatch = !qNumMatch ? line.match(/^(\d{1,3})\s*[.)]\s+(.+)/) : null;

        if (!qNumMatch && !qNumInlineMatch) {
            i++;
            continue;
        }

        const qNum = parseInt((qNumMatch || qNumInlineMatch)[1]);
        if (qNum > 200) { i++; continue; }

        const questionLines = [];
        if (qNumInlineMatch) {
            questionLines.push(qNumInlineMatch[2]);
        }
        i++;

        while (i < lines.length) {
            const nextLine = lines[i].trim();
            if (/^\d{1,3}\s*[.)]\s*$/.test(nextLine)) {
                const nextNum = parseInt(nextLine.match(/^(\d{1,3})/)[1]);
                if (nextNum <= 200) break;
            }
            if (/^\d{1,3}\s*[.)]\s+\S/.test(nextLine)) {
                const nextNum = parseInt(nextLine.match(/^(\d{1,3})/)[1]);
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

function formatMatchListTable(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    let output = [];

    let headerText = [];
    let tableRows = [];
    let currentRow = { col1: "", col2: "" };

    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        if (/^[A-E]\s*\./i.test(line)) {
            if (currentRow.col1) {
                // pushed without col2?
                tableRows.push(currentRow);
                currentRow = { col1: "", col2: "" };
            }
            currentRow.col1 = line;
        } else if (/^[IVX]+\s*\./i.test(line)) {
            currentRow.col2 = line;
            tableRows.push(currentRow);
            currentRow = { col1: "", col2: "" };
        } else {
            // Probably preamble
            if (tableRows.length === 0) {
                headerText.push(line);
            }
        }
        i++;
    }
    if (currentRow.col1 || currentRow.col2) tableRows.push(currentRow);

    if (tableRows.length > 0) {
        // filter out isolated "List I" / "List II" headers since they are implicit
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

function parseQuestionBlock(block, source) {
    const ansMatch = block.match(/Ans(?:wer)?\s*[:.：]\s*\(\s*([a-d*])\s*\)/i);
    if (!ansMatch || ansMatch.index === undefined) return null;

    const correctLetter = ansMatch[1].toLowerCase();

    const explanation = block
        .substring(ansMatch.index + ansMatch[0].length)
        .replace(/\s+/g, " ")
        .trim();

    const beforeAns = block.substring(0, ansMatch.index);

    const optionRegex = /\(\s*([a-d])\s*\)/g;
    const optionPositions = [];
    let m;
    while ((m = optionRegex.exec(beforeAns)) !== null) {
        optionPositions.push({
            letter: m[1].toLowerCase(),
            index: m.index,
            length: m[0].length,
        });
    }

    if (optionPositions.length < 2) return null;

    let rawQuestionText = beforeAns.substring(0, optionPositions[0].index);
    let questionText = rawQuestionText
        .replace(/Choose the correct answer from the options\s*given below\s*[:.]?\s*$/i, "")
        .replace(/Select the correct option\s*[:.]?\s*$/i, "")
        .trim();

    if (/Match List/i.test(questionText)) {
        questionText = formatMatchListTable(questionText);
    } else {
        questionText = questionText.replace(/\s+/g, " ");
    }

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

    if (!questionText) {
        questionText = "(See options below)";
    }

    const cleanOptions = options.map((opt, idx) => ({
        id: `option-${String.fromCharCode(65 + idx)}`,
        text: opt.text,
    }));

    let correctAnswerId;
    if (correctLetter === "*") {
        correctAnswerId = cleanOptions[0].id;
    } else {
        const correctIdx = options.findIndex(o => o.letter === correctLetter);
        correctAnswerId = correctIdx >= 0
            ? cleanOptions[correctIdx].id
            : cleanOptions[0].id;
    }

    const type =
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
        source,
    };
}

const fs = require('fs');
const testData = fs.readFileSync('test-data.txt', 'utf8');

const blocks = testData.split(/^From\s*[:：]/im).filter(b => b.trim());
console.log(`Looking at ${blocks.length} blocks...`);

let failed = 0;
blocks.forEach((block, idx) => {
    const fullBlock = "From: " + block;
    const res = parsePYQText(fullBlock);
    if (!res || res.length === 0) {
        failed++;
    } else {
        const q = res[0];
        if (q.text.includes("| List I |")) {
            console.log(`\n✅ MATCH LIST TABLE (Block ${idx + 1}):\n${q.text}`);
        }
    }
});
console.log(`\nFailed to parse ${failed} out of ${blocks.length} blocks.`);
