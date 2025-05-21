import { ConfigInternal } from "./config.js";

export function getConfigCrudUnderscore(config: ConfigInternal) {
    if (config.crud.underscoreBetweenObjectVariableNames) return "_";
    return "";
}
