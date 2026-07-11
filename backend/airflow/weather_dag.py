from airflow import DAG
from airflow.operators.bash import BashOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'ammar',
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

with DAG(
    dag_id='weather_pipeline',
    default_args=default_args,
    description='run pyspark weather ingestion hourly',
    schedule_interval='@hourly',
    start_date=datetime(2026, 1, 1),
    catchup=False,  # don't backfill missed runs
) as dag:
    
    run_city_upload = BashOperator(
        task_id='run_city_upload',
        bash_command='cd ~/Projects/data-projects/weather_maps/backend && python3 pyspark_city_upload.py',
    )

    # separate the tasks for failure isolation
    run_zip_upload = BashOperator(
        task_id='run_zip_upload',
        bash_command='cd ~/Projects/data-projects/weather_maps/backend && python3 pyspark_zip_upload.py',
    )

    # city data uploads, then zip uploads

    run_city_upload >> run_zip_upload