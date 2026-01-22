package com.fyp.config;

import com.fyp.models.TflFare;
import com.fyp.repos.TflFareRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TflFareDataInitializer {

    @Bean
    CommandLineRunner initTflFares(TflFareRepository repository) {
        return args -> {
            // Only seed if table is empty
            if (repository.count() > 0) {
                return;
            }

            // Bus - flat fare (no zones)
            repository.save(new TflFare("Bus", null, null, 1.75, 1.75));

            // Train/Tube fares - 2024 Oyster/Contactless single fares
            // Zone 1 only
            repository.save(new TflFare("Train", 1, 1, 2.80, 2.70));

            // Zone 1 to other zones
            repository.save(new TflFare("Train", 1, 2, 3.40, 2.80));
            repository.save(new TflFare("Train", 1, 3, 3.70, 3.00));
            repository.save(new TflFare("Train", 1, 4, 4.40, 3.20));
            repository.save(new TflFare("Train", 1, 5, 5.10, 3.50));
            repository.save(new TflFare("Train", 1, 6, 5.60, 3.60));

            // Zone 2 fares
            repository.save(new TflFare("Train", 2, 2, 2.10, 1.90));
            repository.save(new TflFare("Train", 2, 3, 2.10, 1.90));
            repository.save(new TflFare("Train", 2, 4, 2.40, 2.10));
            repository.save(new TflFare("Train", 2, 5, 2.80, 2.30));
            repository.save(new TflFare("Train", 2, 6, 3.10, 2.60));

            // Zone 3 fares
            repository.save(new TflFare("Train", 3, 3, 2.10, 1.90));
            repository.save(new TflFare("Train", 3, 4, 2.10, 1.90));
            repository.save(new TflFare("Train", 3, 5, 2.10, 1.90));
            repository.save(new TflFare("Train", 3, 6, 2.60, 2.10));

            // Zone 4 fares
            repository.save(new TflFare("Train", 4, 4, 2.10, 1.90));
            repository.save(new TflFare("Train", 4, 5, 2.10, 1.90));
            repository.save(new TflFare("Train", 4, 6, 2.10, 1.90));

            // Zone 5 fares
            repository.save(new TflFare("Train", 5, 5, 2.10, 1.90));
            repository.save(new TflFare("Train", 5, 6, 2.10, 1.90));

            // Zone 6 only
            repository.save(new TflFare("Train", 6, 6, 2.10, 1.90));

            System.out.println("TfL fare data initialized with " + repository.count() + " fare rules");
        };
    }
}
