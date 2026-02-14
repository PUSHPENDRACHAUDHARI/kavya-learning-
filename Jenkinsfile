pipeline {
    agent any

    environment {
        PROJECT_DIR = "/root/kavya-learn"
    }

    stages {

        stage('Pull Latest Code') {
            steps {
                sh '''
                cd $PROJECT_DIR
                git checkout master
                git pull origin master
                '''
            }
        }

        stage('Stop Existing Containers') {
            steps {
                sh '''
                cd $PROJECT_DIR
                docker compose down
                '''
            }
        }

        stage('Build & Start Containers') {
            steps {
                sh '''
                cd $PROJECT_DIR
                docker compose up -d --build
                '''
            }
        }

        stage('Verify Deployment') {
            steps {
                sh 'docker ps'
            }
        }
    }
}
