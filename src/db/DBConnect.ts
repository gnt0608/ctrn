import { class_loader } from "utils/helper";
abstract class DBConnect {
  config: any;

  constructor(config) {
    this.config = config;
  }

  static async connect(config) {
    const db_type = config.database_type;

    let clazz = await class_loader("db/" + db_type + "Connect");
    const connector = await clazz.connect(config);

    return connector;
  }

  abstract executeSelect(tablename);
  abstract executeInsert(tablename, object);
  abstract destroy();
}

export { DBConnect };
