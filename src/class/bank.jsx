import { v4 as uuidv4 } from "uuid";

const categoryRules = [
    { category: "Salvadanaio", keywords: ["Accantonamento", "Salvadanaio"] },
    { category: "Palestra", keywords: ["Virgin", "Wellhub", "Fabio Zamuner"] },
    { category: "Auto", keywords: ["ALD AUTOMOTIVE", "Ayvens"] },
    { category: "Affitto", keywords: ["Aldo Cassi", "CANONE DI LOCAZIONE"] },
    { category: "Stipendio", keywords: ["Stipendio", "Pensione"] },
];

/** Determina la categoria dai testi dell'operazione e dei dettagli. */
export function determineNewCategory(operation, detail) {
    const text = `${operation ?? ""} ${detail ?? ""}`.toLocaleLowerCase("it-IT");
    const rule = categoryRules.find(({ keywords }) =>
        keywords.some((keyword) => text.includes(keyword.toLocaleLowerCase("it-IT"))),
    );
    return rule?.category ?? "Spese";
}

export function createBank({
    uid,
    data_valore,
    operation,
    detail,
    card,
    accounting,
    category,
    currency,
    amount,
    data_ins,
    data_modify,
} = {}) {

    const now = new Date().toISOString();

    return {
        uid: uid ?? `BANK_${uuidv4().toUpperCase().substring(0, 8)}`,

        data_valore: data_valore ?? now,
        operation: operation ?? "",
        detail: detail ?? "",
        card: card ?? "",
        accounting: accounting ?? "",
        category: category ?? "",
        new_category: determineNewCategory(operation, detail),
        currency: currency ?? "",
        amount: amount ?? 0,
        data_ins: data_ins ?? now,
        data_modify: data_modify ?? now,
    };
}
