package com.fyp.models;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "tfl_fares")
public class TflFare {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String transportType; // "Bus", "Train"
    private Integer fromZone;
    private Integer toZone;
    private Double peakFare;
    private Double offPeakFare;

    public TflFare() {
    }

    public TflFare(String transportType, Integer fromZone, Integer toZone, Double peakFare, Double offPeakFare) {
        this.transportType = transportType;
        this.fromZone = fromZone;
        this.toZone = toZone;
        this.peakFare = peakFare;
        this.offPeakFare = offPeakFare;
    }

    public Long getId() {
        return id;
    }

    public String getTransportType() {
        return transportType;
    }

    public void setTransportType(String transportType) {
        this.transportType = transportType;
    }

    public Integer getFromZone() {
        return fromZone;
    }

    public void setFromZone(Integer fromZone) {
        this.fromZone = fromZone;
    }

    public Integer getToZone() {
        return toZone;
    }

    public void setToZone(Integer toZone) {
        this.toZone = toZone;
    }

    public Double getPeakFare() {
        return peakFare;
    }

    public void setPeakFare(Double peakFare) {
        this.peakFare = peakFare;
    }

    public Double getOffPeakFare() {
        return offPeakFare;
    }

    public void setOffPeakFare(Double offPeakFare) {
        this.offPeakFare = offPeakFare;
    }
}
