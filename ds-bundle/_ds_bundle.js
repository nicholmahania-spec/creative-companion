/* @ds-bundle: {"namespace":"CreativeCompanion","components":[{"name":"Button","sourcePath":"components/general/Button/Button.jsx"}],"sourceHashes":{"components/general/Button/Button.jsx":"bae8a7f666be","components/general/Button/Button.d.ts":"65a9a8598091","components/general/Button/Button.prompt.md":"c8d52ae5110e"},"inlinedExternals":[],"builtBy":"cc-design-sync"} */
var CreativeCompanion = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // .design-sync/ds-entry.js
  var ds_entry_exports = {};
  __export(ds_entry_exports, {
    Button: () => Button
  });

  // src/components/ui/Button.jsx
  function Button({
    children,
    variant = "primary",
    size = "md",
    className = "",
    onClick,
    ...props
  }) {
    const baseCls = "btn";
    let variantCls = "btn-secondary";
    if (variant === "primary") variantCls = "btn-primary";
    else if (variant === "ghost") variantCls = "btn-ghost";
    else if (variant === "outline" || variant === "secondary")
      variantCls = "btn-secondary";
    const sizeCls = size === "sm" || size === "soft" ? "btn-sm" : "";
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: `${baseCls} ${variantCls} ${sizeCls} ${className}`.trim(),
        onClick,
        ...props
      },
      children
    );
  }
  return __toCommonJS(ds_entry_exports);
})();
window.CreativeCompanion=CreativeCompanion.__dsMainNs?Object.assign({},CreativeCompanion,CreativeCompanion.__dsMainNs,{__dsMainNs:undefined}):CreativeCompanion;
