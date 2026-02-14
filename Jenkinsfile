pipeline {
    agent any

    environment {
        PROJECT_DIR = "/root/kavya-learn"
        REPO_URL = "https://github.com/adityamahajan785/kavya-learn.git"
    }

    stages {

        stage('Clone / Pull Repository') {
            steps {
                sh '''
                if [ -d "$PROJECT_DIR" ]; then
                    cd $PROJECT_DIR
                    git pull origin main
                else
                    git clone $REPO_URL $PROJECT_DIR
                fi
                '''
            }
        }

        stage('Stop Existing Containers') {
            steps {
                sh '''
                cd $PROJECT_DIR
                docker compose down || true
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

