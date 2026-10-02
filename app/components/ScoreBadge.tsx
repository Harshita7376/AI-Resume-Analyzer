type ScoreBadgeProps = {
    score: number;
};

const ScoreBadge = ({ score }: ScoreBadgeProps) => {
    const style = score > 70
        ? { background: "bg-badge-green", text: "text-badge-green-text", label: "Strong" }
        : score > 49
            ? { background: "bg-badge-yellow", text: "text-badge-yellow-text", label: "Good Start" }
            : { background: "bg-badge-red", text: "text-badge-red-text", label: "Needs Work" };

    return (
        <div className={`score-badge ${style.background}`}>
            <p className={style.text}>{style.label}</p>
        </div>
    );
};

export default ScoreBadge;
