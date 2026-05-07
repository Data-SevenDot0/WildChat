from pyspark.sql import SparkSession
from pyspark.sql.functions import col

spark = SparkSession.builder.appName("SplitByLanguage").master("local[*]") \
    .config("spark.driver.memory", "8g") \
    .config("spark.sql.parquet.mergeSchema", "false") \
    .getOrCreate()

df = spark.read.parquet("data/WildChatData/s2_workfile_cleaned.parquet")

df.filter(col("language") == "English") \
  .write.mode("overwrite").parquet("data/WildChatData/English")

df.filter(col("language") != "English") \
  .write.mode("overwrite").parquet("data/WildChatData/foreigns")

english_count = spark.read.parquet("data/WildChatData/English").count()
foreign_count = spark.read.parquet("data/WildChatData/foreigns").count()
print(f"English:  {english_count:,}")
print(f"Foreign:  {foreign_count:,}")
print(f"Total:    {english_count + foreign_count:,}")

spark.stop()