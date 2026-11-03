import dictionary from "./ar.json";
import { commonAr, withCommonCopy } from "../common.cjs";
export default withCommonCopy({ ...commonAr, ...dictionary }, "ui", commonAr);
