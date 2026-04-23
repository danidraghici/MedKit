using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedKit.Api.Models.Entities;

[Table("medical_records")]
public class MedicalRecordEntity
{
    [Key, Column("id")]
    public Guid Id { get; set; }

    [Column("visit_date")]
    public DateOnly VisitDate { get; set; }
}
