import dictionary from "./en.json";
import { commonEn, withCommonCopy } from "../common.cjs";
export default withCommonCopy({ ...commonEn, ...dictionary }, "ui", commonEn);
