export const MOCK_QUESTIONS_MANAGE = [
    {
        id: "m1",
        text: "What is the primary function of the mitochondria in a eukaryotic cell?",
        options: ["Energy production", "Protein synthesis", "DNA storage", "Cell division"],
        correctAnswerId: 0,
        explanation: "Mitochondria generate most of the chemical energy needed to power the cell's biochemical reactions.",
        type: "multiple-choice",
        categoryId: "Biology",
        createdAt: Date.now() - 86400000 * 2,
        srsStatus: "Overdue"
    },
    {
        id: "m2",
        text: "Explain the difference between supervised and unsupervised learning.",
        options: ["Data is labeled vs unlabeled", "Fast vs slow", "Accurate vs inaccurate"],
        correctAnswerId: 0,
        explanation: "Supervised learning uses labeled datasets to train algorithms.",
        type: "multiple-choice",
        categoryId: "Comp Sci",
        createdAt: Date.now() - 3600000,
        srsStatus: "New"
    },
    {
        id: "m3",
        text: "True or False: The sky is blue because of Rayleigh scattering.",
        options: ["True", "False"],
        correctAnswerId: 0,
        explanation: "Rayleigh scattering of sunlight in the atmosphere causes diffuse sky radiation.",
        type: "true-false",
        categoryId: "Physics",
        createdAt: Date.now() - 86400000 * 10,
        srsStatus: "Mastered"
    }
];
