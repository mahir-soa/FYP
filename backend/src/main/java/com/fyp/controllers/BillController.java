package com.fyp.controllers;

import com.fyp.models.Bill;
import com.fyp.repos.BillRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bills")
@CrossOrigin(origins = "http://localhost:5173")
public class BillController {

    private final BillRepository billRepository;

    public BillController(BillRepository billRepository) {
        this.billRepository = billRepository;
    }

    @GetMapping
    public List<Bill> getBills(@RequestParam Long userId) {
        return billRepository.findByUserIdOrderByDueDayAsc(userId);
    }

    @PostMapping
    public Bill createBill(@RequestParam Long userId, @RequestBody Bill bill) {
        bill.setUserId(userId);
        bill.setPaid(false);
        return billRepository.save(bill);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Bill> updateBill(
            @PathVariable Long id,
            @RequestParam Long userId,
            @RequestBody Bill bill) {
        return billRepository.findById(id)
                .filter(existing -> existing.getUserId() != null && existing.getUserId().equals(userId))
                .map(existing -> {
                    existing.setName(bill.getName());
                    existing.setAmount(bill.getAmount());
                    existing.setDueDay(bill.getDueDay());
                    existing.setFrequency(bill.getFrequency());
                    existing.setCategory(bill.getCategory());
                    existing.setNotes(bill.getNotes());
                    return ResponseEntity.ok(billRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBill(@PathVariable Long id, @RequestParam Long userId) {
        return billRepository.findById(id)
                .filter(existing -> existing.getUserId() != null && existing.getUserId().equals(userId))
                .map(existing -> {
                    billRepository.delete(existing);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/pay")
    public ResponseEntity<Bill> markAsPaid(
            @PathVariable Long id,
            @RequestParam Long userId) {
        String currentMonth = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
        String today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE);

        return billRepository.findById(id)
                .filter(existing -> existing.getUserId() != null && existing.getUserId().equals(userId))
                .map(existing -> {
                    existing.setPaid(true);
                    existing.setPaidDate(today);
                    existing.setLastPaidMonth(currentMonth);
                    return ResponseEntity.ok(billRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/unpay")
    public ResponseEntity<Bill> markAsUnpaid(
            @PathVariable Long id,
            @RequestParam Long userId) {
        return billRepository.findById(id)
                .filter(existing -> existing.getUserId() != null && existing.getUserId().equals(userId))
                .map(existing -> {
                    existing.setPaid(false);
                    existing.setPaidDate(null);
                    return ResponseEntity.ok(billRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/summary")
    public Map<String, Object> getBillsSummary(@RequestParam Long userId) {
        String currentMonth = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
        List<Bill> bills = billRepository.findByUserId(userId);

        double totalMonthly = 0;
        double paidThisMonth = 0;
        double unpaidThisMonth = 0;
        int paidCount = 0;
        int unpaidCount = 0;

        for (Bill bill : bills) {
            double monthlyAmount = getMonthlyAmount(bill);
            totalMonthly += monthlyAmount;

            // Check if this bill applies to current month and is paid
            if (currentMonth.equals(bill.getLastPaidMonth())) {
                paidThisMonth += bill.getAmount();
                paidCount++;
            } else if (isBillDueThisMonth(bill)) {
                unpaidThisMonth += bill.getAmount();
                unpaidCount++;
            }
        }

        return Map.of(
            "totalMonthlyBills", Math.round(totalMonthly * 100.0) / 100.0,
            "paidThisMonth", Math.round(paidThisMonth * 100.0) / 100.0,
            "unpaidThisMonth", Math.round(unpaidThisMonth * 100.0) / 100.0,
            "paidCount", paidCount,
            "unpaidCount", unpaidCount,
            "totalBills", bills.size()
        );
    }

    private double getMonthlyAmount(Bill bill) {
        if ("MONTHLY".equals(bill.getFrequency())) return bill.getAmount();
        if ("QUARTERLY".equals(bill.getFrequency())) return bill.getAmount() / 3;
        if ("YEARLY".equals(bill.getFrequency())) return bill.getAmount() / 12;
        return bill.getAmount();
    }

    private boolean isBillDueThisMonth(Bill bill) {
        // For simplicity, monthly bills are always due
        // Quarterly/Yearly would need more complex logic
        return "MONTHLY".equals(bill.getFrequency());
    }
}
