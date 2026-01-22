package com.fyp.repos;

import com.fyp.models.TflFare;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface TflFareRepository extends JpaRepository<TflFare, Long> {

    @Query("SELECT f FROM TflFare f WHERE f.transportType = :type " +
           "AND ((f.fromZone = :fromZone AND f.toZone = :toZone) " +
           "OR (f.fromZone = :toZone AND f.toZone = :fromZone))")
    Optional<TflFare> findFare(@Param("type") String transportType,
                               @Param("fromZone") Integer fromZone,
                               @Param("toZone") Integer toZone);

    Optional<TflFare> findByTransportType(String transportType);
}
