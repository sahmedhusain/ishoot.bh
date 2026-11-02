import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import ts from "typescript";
import { expect, test } from "vitest";

test("admin uses shared dialogs instead of native blocking prompts", () => {
  const files = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "apps/admin"],
    { encoding: "utf8" },
  )
    .trim()
    .split("\n")
    .filter((file) => /\.[jt]sx?$/.test(file) && existsSync(file));
  const native: string[] = [];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const source = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
    );
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        const call = node.expression;
        if (
          (ts.isPropertyAccessExpression(call) &&
            ["window", "globalThis"].includes(
              call.expression.getText(source),
            ) &&
            ["confirm", "alert", "prompt"].includes(call.name.text)) ||
          (ts.isIdentifier(call) && ["alert", "prompt"].includes(call.text))
        )
          native.push(
            `${file}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}`,
          );
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  expect(native).toEqual([]);
});
