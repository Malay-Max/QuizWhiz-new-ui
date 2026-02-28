import QuizSession from "@/components/quiz/quiz-session";
import { Question } from "@/lib/schemas";

// Mock data using correct schema format
const MOCK_QUESTIONS: Question[] = [
    {
        id: "1",
        text: "What is the output of `console.log(typeof NaN)` in JavaScript?",
        options: [
            { id: "option-A", text: "'number'" },
            { id: "option-B", text: "'NaN'" },
            { id: "option-C", text: "'undefined'" },
            { id: "option-D", text: "'object'" },
        ],
        correctAnswerId: "option-A",
        explanation: "`NaN` stands for 'Not-a-Number', but its type is actually `'number'`. This is a quirky behavior in JavaScript.",
        type: "multiple-choice",
        categoryId: "js",
    },
    {
        id: "2",
        text: "Which method is used to remove the last element from an array?",
        options: [
            { id: "option-A", text: "shift()" },
            { id: "option-B", text: "pop()" },
            { id: "option-C", text: "push()" },
            { id: "option-D", text: "unshift()" },
        ],
        correctAnswerId: "option-B",
        explanation: "`pop()` removes the last element from an array and returns that element. `shift()` removes the first element.",
        type: "multiple-choice",
        categoryId: "js",
    },
    {
        id: "3",
        text: "True or False: React components must start with an uppercase letter.",
        options: [
            { id: "option-A", text: "True" },
            { id: "option-B", text: "False" },
        ],
        correctAnswerId: "option-A",
        explanation: "React treats components starting with lowercase letters as DOM tags. User-defined components must be capitalized.",
        type: "true-false",
        categoryId: "react",
    }
];

export default function QuizPage({ params }: { params: { sessionId: string } }) {
    return <QuizSession questions={MOCK_QUESTIONS} categoryName="Demo Quiz" />;
}
