"use strict";

const commonEn = require("./common/en.json");
const commonAr = require("./common/ar.json");
const bindings = require("./common-bindings.json");

const ALIASES = {
  saveChanges: ["saveChanges", "save"],
  saving: ["saving", "loading", "save"],
  confirm: ["confirm", "yes"],
  confirmAction: ["confirmAction", "confirm", "yes"],
  update: ["update", "edit", "save"],
  add: ["add", "create"],
  remove: ["remove", "delete"],
  downloadPdf: ["downloadPdf", "download"],
  printDocument: ["printDocument", "print"],
  searchPlaceholder: ["searchPlaceholder", "search"],
  quickSearch: ["quickSearch", "search"],
  phoneNumber: ["phoneNumber", "phone"],
  sendWhatsApp: ["sendWhatsApp", "sendWhatsapp"],
  tryAgain: ["tryAgain", "retry"],
  refresh: ["refresh", "retry"],
  previous: ["previous", "back"],
  language: ["language", "switchLang"],
  submitting: ["submitting", "loading"],
};

function resolveCommonTranslations(locale, overrides) {
  const base = locale === "ar" ? commonAr : commonEn;
  const copy = { ...base };
  for (const key of Object.keys(base)) {
    const candidates = ALIASES[key] || [key];
    for (const cand of candidates) {
      if (typeof overrides?.[cand] === "string" && overrides[cand].trim()) {
        copy[key] = overrides[cand];
        break;
      }
    }
  }
  return copy;
}

// Bind existing public paths so consolidating copy does not require changing every screen.
function withCommonCopy(dictionary, scope, common) {
  function apply(source, map) {
    const result = { ...source };
    for (const [key, value] of Object.entries(map)) {
      if (typeof value === "string") {
        if (typeof common[value] !== "string") throw new Error(`Unknown common copy key: ${value}`);
        result[key] = common[value];
      } else result[key] = apply(source?.[key], value);
    }
    return result;
  }
  return apply(dictionary, bindings[scope]);
}

module.exports = { commonEn, commonAr, resolveCommonTranslations, withCommonCopy };
