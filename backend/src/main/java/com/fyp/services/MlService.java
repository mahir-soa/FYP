package com.fyp.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
public class MlService {

    @Value("${ml.service.url:http://localhost:8000}")
    private String mlServiceUrl;

    private final RestTemplate restTemplate;

    public MlService() {
        this.restTemplate = new RestTemplate();
    }

    public Map<String, Object> analyseUser(Long userId) {
        String url = mlServiceUrl + "/api/ml/analyse/" + userId;
        ResponseEntity<Map> response = restTemplate.postForEntity(url, null, Map.class);
        return response.getBody();
    }

    public Map<String, Object> getPersona(Long userId) {
        String url = mlServiceUrl + "/api/ml/persona/" + userId;
        ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
        return response.getBody();
    }

    public Map<String, Object> getRisk(Long userId) {
        String url = mlServiceUrl + "/api/ml/risk/" + userId;
        ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
        return response.getBody();
    }

    public Map<String, Object> getNudges(Long userId) {
        String url = mlServiceUrl + "/api/ml/nudges/" + userId;
        ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
        return response.getBody();
    }

    public boolean isHealthy() {
        try {
            String url = mlServiceUrl + "/api/ml/health";
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            return response.getStatusCode() == HttpStatus.OK;
        } catch (Exception e) {
            return false;
        }
    }
}
