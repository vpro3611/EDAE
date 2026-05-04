export type TemplateVars = Record<string, string | number>;

export function renderTemplate(template: string, vars: TemplateVars): string {
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
        const val = vars[key];
        return val !== undefined ? String(val) : `{{ ${key} }}`;
    });
}
