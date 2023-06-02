const { check_type, base_dir } = require("../utils/env_loader");
const { RESULT_CODE_OK, RESULT_CODE_NG } = require("../utils/constant");
const fs = require("fs");

const { import_csv, append_data } = require("../utils/helper");
const path = require("path");
async function main(proc) {
  if (proc.args instanceof Array) {
    return await exec(...proc.args);
  } else {
    return await exec(
      proc.args["expect_path"],
      proc.args["actual_path"],
      proc.args["out_path"]
    );
  }
}

async function exec(expect_path, actual_path, out_path) {
  console.log("Start");
  var stats = fs.statSync(path.resolve(base_dir(), expect_path));
  var match_result = RESULT_CODE_OK;
  if (stats.isDirectory()) {
    let in_files = fs.readdirSync(path.resolve(base_dir(), expect_path));
    for (let in_file of in_files) {
      console.log(in_file);
      let tablename = path.basename(in_file, ".csv");

      const expect_data = path.resolve(base_dir(), expect_path, in_file);
      const actual_data = path.resolve(base_dir(), actual_path, in_file);
      var stats_out = fs.statSync(path.resolve(base_dir(), out_path));
      const out = stats_out.isDirectory()
        ? path.resolve(base_dir(), out_path, tablename + ".txt")
        : path.resolve(base_dir(), out_path);
      tmp_result = await match(expect_data, actual_data, out);
      match_result = Math.max(tmp_result, match_result);
    }
  } else {
    const expect_data = path.resolve(base_dir(), expect_path);
    const actual_data = path.resolve(base_dir(), actual_path);
    let tablename = path.basename(expect_data, ".csv");
    var stats_out = fs.statSync(path.resolve(base_dir(), out_path));
    const out = stats_out.isDirectory()
      ? path.resolve(base_dir(), out_path, tablename + ".txt")
      : path.resolve(base_dir(), out_path);
    match_result = await match(expect_data, actual_data, out);
  }
  return match_result;
}

async function match(expect_data, actual_data, out) {
  const type = check_type();
  var expect = import_csv(expect_data);
  var actual = import_csv(actual_data);

  if (!expect || expect.length < 1) {
    // 期待にデータが存在せず、実績が存在する場合はすべてエラーとして終了
    // 実績も存在しない場合は forがスキップされて終了になる

    if (is_completely(type) && actual && actual.length > 0) {
      for (var index in actual) {
        append_data(
          out,
          "[NG] actual row [" +
            (Number(index) + 1) +
            "] did not exist in expect"
        );
      }
    }
    return RESULT_CODE_NG;
  }

  if (!actual || actual.length < 1) {
    for (var index in expect) {
      append_data(
        out,
        "[NG] exprect row [" + (Number(index) + 1) + "] did not match."
      );
    }
    return RESULT_CODE_NG;
  }

  var matched_actual_index = [];
  var returncode = RESULT_CODE_OK;
  for (var index in expect) {
    var actual_index = match_data(expect[index], actual, matched_actual_index);
    if (actual_index >= 0) {
      append_data(
        out,
        "[OK] expect row [" +
          (Number(index) + 1) +
          "] matched. actual row [" +
          (Number(actual_index) + 1) +
          "]"
      );
      matched_actual_index.push(actual_index);
    } else {
      append_data(
        out,
        "[NG] exprect row [" + (Number(index) + 1) + "] did not match."
      );
      returncode = RESULT_CODE_NG;
    }
  }

  for (var index in actual) {
    if (is_completely(type) && matched_actual_index.indexOf(index) < 0) {
      append_data(
        out,
        "[NG] actual row [" + (Number(index) + 1) + "] did not exist in expect."
      );
      returncode = RESULT_CODE_NG;
    }
  }

  return returncode;
}

function match_data(expect_row, actual_data, matched_actual_index) {
  for (const index in actual_data) {
    if (matched_actual_index.indexOf(index) > -1) {
      continue;
    }
    const actual_row = actual_data[index];
    const actual_keys = Object.keys(actual_row);

    match_flg = true;
    for (var key of Object.keys(expect_row)) {
      const actual_key = get_actual_key(actual_keys, key);
      if (actual_key) {
        const actual = cast(actual_row[actual_key]);
        const expect = cast(expect_row[key]);
        if (actual == expect) {
          //match
        } else {
          match_flg = false;
        }
      } else {
        match_flg = false;
      }
    }
    if (match_flg) {
      return index;
    }
  }
  return -1;
}

function cast(variable) {
  const reg = new RegExp("(\\d{4})-(\\d{2})-(\\d{2})*");
  if (reg.test(variable)) {
    return new Date(varialbe).getTime();
  }
  return variable;
}

function get_actual_key(actual_keys, key) {
  for (var actual_key of actual_keys) {
    if (actual_key.toUpperCase() == key.toUpperCase()) {
      return actual_key;
    }
  }
  return undefined;
}
function is_completely(check_type) {
  return check_type == "complete";
}
function is_contain(check_type) {
  return check_type == "contain";
}

module.exports.main = main;